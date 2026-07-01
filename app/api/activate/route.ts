import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { createClient } from "@supabase/supabase-js";

import {
  buildRewardClaimSource,
  isUnifiedActivationCodeValid,
  normalizeActivationCode,
} from "@/src/security/unified_activation";

function originAllowed(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return true;
  try {
    const u = new URL(origin);
    return u.host === host;
  } catch {
    return false;
  }
}

function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

async function resolveRewardCode(code: string) {
  const env = getSupabaseEnv();
  if (!env) return { ok: false as const };

  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const normalized = normalizeActivationCode(code);
  if (!normalized) return { ok: false as const };

  const rewardEvent = await supabase
    .from("heartbeat_events")
    .select("source, note")
    .like("source", `reward:%:${normalized}`)
    .maybeSingle();

  if (rewardEvent.error || !rewardEvent.data) {
    return { ok: false as const };
  }

  const claimSource = buildRewardClaimSource(normalized);
  const existingClaim = await supabase
    .from("heartbeat_events")
    .select("id")
    .eq("source", claimSource)
    .maybeSingle();

  if (existingClaim.error) {
    return { ok: false as const };
  }

  if (existingClaim.data) {
    return { ok: false as const, claimed: true };
  }

  let ownerId = "";
  try {
    const parsed = JSON.parse(rewardEvent.data.note ?? "{}") as { owner_id?: string };
    ownerId = typeof parsed.owner_id === "string" ? parsed.owner_id : "";
  } catch {
    ownerId = "";
  }

  const claimed = await supabase
    .from("heartbeat_events")
    .insert({
      source: claimSource,
      note: JSON.stringify({
        kind: "reward_claim",
        code: normalized,
        owner_id: ownerId,
        claimed_at: new Date().toISOString(),
      }),
    })
    .select("id")
    .maybeSingle();

  if (claimed.error) {
    return { ok: false as const };
  }

  return { ok: true as const };
}

export async function POST(req: Request) {
  if (!originAllowed(req)) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const secretStr = process.env.ACTIVATION_SECRET;
  const masterCode = process.env.MASTER_CODE;
  if (!secretStr || !masterCode) {
    return NextResponse.json({ success: false }, { status: 500 });
  }

  const secret = new TextEncoder().encode(secretStr);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const code = (body as { code?: unknown }).code;
  const mode = (body as { mode?: unknown }).mode;

  const isPaymentUnlock = mode === "payment";
  const isMasterCodeUnlock = isUnifiedActivationCodeValid(code, masterCode);
  const rewardUnlock = !isMasterCodeUnlock ? await resolveRewardCode(String(code ?? "")) : { ok: false as const };
  const isCodeUnlock = isMasterCodeUnlock || rewardUnlock.ok;

  if (!isPaymentUnlock && !isCodeUnlock) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const token = await new SignJWT({ status: "ACTIVE" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("2h")
    .sign(secret);

  const res = NextResponse.json({
    success: true,
    active: true,
    mode: isPaymentUnlock ? "payment" : isMasterCodeUnlock ? "code" : "reward",
  });
  res.cookies.set("aim2m_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
  return res;
}
