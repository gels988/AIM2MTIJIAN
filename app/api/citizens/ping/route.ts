import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export async function GET() {
  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.json({ ok: false, error: "supabase_env_missing" }, { status: 500 });
  }

  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { error } = await supabase.from("app_users").select("id").limit(1);
  if (error) {
    return NextResponse.json(
      { ok: false, error: "supabase_query_failed", details: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

