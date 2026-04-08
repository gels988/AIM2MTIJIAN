import { createClient } from "@supabase/supabase-js";
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

  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

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

  const { error } = await supabase.from("app_users").select("id").limit(1);
  if (error) {
    return NextResponse.json(
      { ok: false, error: "supabase_query_failed", details: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
