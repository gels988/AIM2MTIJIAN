import { NextResponse } from "next/server";

function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function getErrorCode(err: unknown) {
  const e = err as { cause?: unknown; code?: unknown; message?: unknown };
  const cause = e?.cause as { code?: unknown; message?: unknown } | undefined;
  const code =
    typeof cause?.code === "string"
      ? cause.code
      : typeof e?.code === "string"
        ? e.code
        : null;
  const message =
    typeof cause?.message === "string"
      ? cause.message
      : typeof e?.message === "string"
        ? e.message
        : null;
  return { code, message };
}

async function supabaseFetchJson(
  url: string,
  anonKey: string,
  path: string,
  init: RequestInit,
) {
  const baseUrl = url.replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json") ? await res.json() : await res.text();
  return { ok: res.ok, status: res.status, body };
}

export async function GET(req: Request) {
  const env = getSupabaseEnv();
  const timestamp = new Date().toISOString();
  if (!env) {
    return NextResponse.json(
      { status: "error", timestamp, database: "missing_env" },
      { status: 500 },
    );
  }

  const ua = req.headers.get("user-agent") || "";
  const source =
    ua.includes("Vercel") || ua.includes("vercel") ? "vercel_cron" : "manual";

  try {
    const insert = await supabaseFetchJson(env.url, env.anonKey, "/rest/v1/heartbeat_events", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{ source }]),
    });

    if (insert.ok) {
      return NextResponse.json({
        status: "ok",
        timestamp,
        database: "connected",
        write: "heartbeat_events.insert",
      });
    }

    const fallback = await supabaseFetchJson(
      env.url,
      env.anonKey,
      "/rest/v1/app_users?select=id&limit=1",
      { method: "GET" },
    );

    if (fallback.ok) {
      return NextResponse.json({
        status: "ok",
        timestamp,
        database: "connected",
        write: "skipped",
        read: "app_users.select",
        note: "heartbeat_events_missing_or_blocked",
      });
    }

    return NextResponse.json(
      {
        status: "error",
        timestamp,
        database: "failed",
        write_error: { status: insert.status, body: insert.body },
        read_error: { status: fallback.status, body: fallback.body },
      },
      { status: 502 },
    );
  } catch (err) {
    const { code, message } = getErrorCode(err);
    return NextResponse.json(
      {
        status: "error",
        timestamp,
        database: "failed",
        error: code ? `${code}${message ? `: ${message}` : ""}` : message ?? "fetch_failed",
      },
      { status: 502 },
    );
  }
}

