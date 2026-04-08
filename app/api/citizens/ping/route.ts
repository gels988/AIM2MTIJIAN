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
  const code = typeof cause?.code === "string" ? cause.code : typeof e?.code === "string" ? e.code : null;
  const message =
    typeof cause?.message === "string"
      ? cause.message
      : typeof e?.message === "string"
        ? e.message
        : null;
  return { code, message };
}

async function probeSupabase(url: string, anonKey: string) {
  const endpoint = `${url.replace(/\/+$/, "")}/rest/v1/`;
  try {
    const res = await fetch(endpoint, {
      method: "HEAD",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
      },
      cache: "no-store",
    });
    return { ok: true, status: res.status };
  } catch (err) {
    const { code, message } = getErrorCode(err);
    return { ok: false, status: null as number | null, code, message };
  }
}

export async function GET() {
  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.json({ ok: false, error: "supabase_env_missing" }, { status: 500 });
  }

  const probe = await probeSupabase(env.url, env.anonKey);
  if (!probe.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "supabase_unreachable",
        details: probe.code ? `${probe.code}${probe.message ? `: ${probe.message}` : ""}` : probe.message ?? "fetch_failed",
      },
      { status: 502 },
    );
  }

  const baseUrl = env.url.replace(/\/+$/, "");
  const queryUrl = `${baseUrl}/rest/v1/app_users?select=id&limit=1`;
  try {
    const res = await fetch(queryUrl, {
      method: "GET",
      headers: {
        apikey: env.anonKey,
        authorization: `Bearer ${env.anonKey}`,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const ct = res.headers.get("content-type") || "";
      const body = ct.includes("application/json")
        ? JSON.stringify(await res.json()).slice(0, 240)
        : (await res.text()).slice(0, 240);
      return NextResponse.json(
        { ok: false, error: "supabase_http_error", details: `HTTP ${res.status} ${body}` },
        { status: 502 },
      );
    }
  } catch (err) {
    const { code, message } = getErrorCode(err);
    return NextResponse.json(
      {
        ok: false,
        error: "supabase_query_failed",
        details: code ? `${code}${message ? `: ${message}` : ""}` : message ?? "fetch_failed",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
