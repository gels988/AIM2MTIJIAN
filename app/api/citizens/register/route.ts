import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeIdentifier(input: string) {
  return input.trim().slice(0, 64);
}

export async function POST(req: Request) {
  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.json({ ok: false, error: "supabase_env_missing" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const identifierRaw = typeof body.identifier === "string" ? body.identifier : "";
  const identifier = normalizeIdentifier(identifierRaw);
  const referrerId = typeof body.referrer_id === "string" ? body.referrer_id.trim() : null;

  if (!identifier) {
    return NextResponse.json({ ok: false, error: "identifier_required" }, { status: 400 });
  }

  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const existing = await supabase
    .from("app_users")
    .select("id, phone_number, balance_g, referrer_id, created_at")
    .eq("phone_number", identifier)
    .maybeSingle();

  if (existing.error) {
    return NextResponse.json(
      { ok: false, error: "supabase_query_failed", details: existing.error.message },
      { status: 502 },
    );
  }

  if (existing.data) {
    return NextResponse.json({ ok: true, user: existing.data, created: false });
  }

  const insertPayload: Record<string, unknown> = {
    phone_number: identifier,
    created_at: new Date().toISOString(),
  };
  if (referrerId) insertPayload.referrer_id = referrerId;

  const inserted = await supabase
    .from("app_users")
    .insert(insertPayload)
    .select("id, phone_number, balance_g, referrer_id, created_at")
    .single();

  if (inserted.error) {
    return NextResponse.json(
      { ok: false, error: "supabase_insert_failed", details: inserted.error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, user: inserted.data, created: true });
}

