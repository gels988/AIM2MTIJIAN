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
  const res = await fetch(endpoint, {
    method: "HEAD",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
    },
    cache: "no-store",
  });
  return res.status;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeIdentifier(input: string) {
  return input.trim().slice(0, 64);
}

function normalizeReferrer(input: unknown) {
  return typeof input === "string" ? input.trim().slice(0, 64) : null;
}

function buildReferralLink(req: Request, userId: string) {
  const base = new URL(req.url).origin;
  return `${base}/register.html?ref=${encodeURIComponent(userId)}`;
}

async function resolveReferrerId(
  supabase: any,
  referrerToken: string | null,
) {
  if (!referrerToken) return null;

  const byId = await supabase
    .from("app_users")
    .select("id")
    .eq("id", referrerToken)
    .maybeSingle();

  const byIdRow = byId.data as { id?: string } | null;
  if (!byId.error && byIdRow?.id) {
    return byIdRow.id;
  }

  const byPhone = await supabase
    .from("app_users")
    .select("id")
    .eq("phone_number", referrerToken)
    .maybeSingle();

  const byPhoneRow = byPhone.data as { id?: string } | null;
  if (!byPhone.error && byPhoneRow?.id) {
    return byPhoneRow.id;
  }

  return null;
}

export async function POST(req: Request) {
  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.json({ ok: false, error: "supabase_env_missing" }, { status: 500 });
  }

  try {
    await probeSupabase(env.url, env.anonKey);
  } catch (err) {
    const { code, message } = getErrorCode(err);
    return NextResponse.json(
      {
        ok: false,
        error: "supabase_unreachable",
        details: code ? `${code}${message ? `: ${message}` : ""}` : message ?? "fetch_failed",
      },
      { status: 502 },
    );
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
  const referrerToken = normalizeReferrer(body.referrer_id);

  if (!identifier) {
    return NextResponse.json({ ok: false, error: "identifier_required" }, { status: 400 });
  }

  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const resolvedReferrerId = await resolveReferrerId(supabase, referrerToken);

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
    let user = existing.data;

    if (
      resolvedReferrerId &&
      !user.referrer_id &&
      user.id !== resolvedReferrerId
    ) {
      const updated = await supabase
        .from("app_users")
        .update({ referrer_id: resolvedReferrerId })
        .eq("id", user.id)
        .select("id, phone_number, balance_g, referrer_id, created_at")
        .single();

      if (updated.error) {
        return NextResponse.json(
          { ok: false, error: "supabase_update_failed", details: updated.error.message },
          { status: 502 },
        );
      }

      user = updated.data;
    }

    return NextResponse.json({
      ok: true,
      user,
      created: false,
      referral_link: buildReferralLink(req, user.id),
    });
  }

  const insertPayload: Record<string, unknown> = {
    phone_number: identifier,
    created_at: new Date().toISOString(),
  };
  if (resolvedReferrerId) insertPayload.referrer_id = resolvedReferrerId;

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

  return NextResponse.json({
    ok: true,
    user: inserted.data,
    created: true,
    referral_link: buildReferralLink(req, inserted.data.id),
  });
}
