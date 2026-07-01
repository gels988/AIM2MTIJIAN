import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  buildReferralCode,
  buildRewardActivationCode,
  buildRewardEventSource,
  buildShortReferralLink,
  getRewardProgress,
  REWARD_MILESTONE,
} from "@/src/security/unified_activation";

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

function buildReferralLink(req: Request, referralCodeOrId: string) {
  const base = new URL(req.url).origin;
  return buildShortReferralLink(base, referralCodeOrId);
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

  const byCode = await supabase
    .from("app_users")
    .select("id")
    .eq("referral_code", referrerToken)
    .maybeSingle();

  const byCodeRow = byCode.data as { id?: string } | null;
  if (!byCode.error && byCodeRow?.id) {
    return byCodeRow.id;
  }

  return null;
}

async function buildUniqueReferralCode(supabase: any, seed: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = buildReferralCode(seed, attempt);
    const existing = await supabase
      .from("app_users")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();
    if (!existing.error && !existing.data) {
      return code;
    }
  }
  return buildReferralCode(`${seed}:${Date.now()}`, 0);
}

async function maybeIssueRewardCode(
  supabase: any,
  ownerId: string,
  referralCount: number,
) {
  const progress = getRewardProgress(referralCount, REWARD_MILESTONE);
  if (!progress.rewardEarnedNow) return null;

  const milestone = progress.referralCount;
  const serial = Math.floor(milestone / REWARD_MILESTONE);
  const candidateCode = buildRewardActivationCode(ownerId, milestone, serial);
  const source = buildRewardEventSource(ownerId, milestone, candidateCode);

  const existing = await supabase
    .from("heartbeat_events")
    .select("id, note")
    .eq("source", source)
    .maybeSingle();

  if (existing.data) {
    try {
      const parsed = JSON.parse(existing.data.note ?? "{}") as { code?: string };
      return typeof parsed.code === "string" ? parsed.code : candidateCode;
    } catch {
      return candidateCode;
    }
  }

  const note = JSON.stringify({
    kind: "reward_code",
    owner_id: ownerId,
    milestone,
    referral_count: referralCount,
    code: candidateCode,
    created_at: new Date().toISOString(),
  });

  const inserted = await supabase
    .from("heartbeat_events")
    .insert({ source, note })
    .select("id")
    .maybeSingle();

  if (inserted.error) {
    return null;
  }

  return candidateCode;
}

async function getReferralRewardSummary(
  supabase: any,
  ownerId: string,
  referralCodeOrId: string,
  req: Request,
) {
  const countResult = await supabase
    .from("app_users")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", ownerId);

  const referralCount = typeof countResult.count === "number" ? countResult.count : 0;
  const progress = getRewardProgress(referralCount, REWARD_MILESTONE);

  const rewardEvents = await supabase
    .from("heartbeat_events")
    .select("source, note, created_at")
    .like("source", `reward:${ownerId}:%`);

  const rewards = Array.isArray(rewardEvents.data)
    ? rewardEvents.data
        .map((item: { source?: string; note?: string | null; created_at?: string }) => {
          try {
            const parsed = JSON.parse(item.note ?? "{}") as {
              code?: string;
              milestone?: number;
            };
            return {
              code: typeof parsed.code === "string" ? parsed.code : "",
              milestone:
                typeof parsed.milestone === "number" ? parsed.milestone : Number.NaN,
              created_at: item.created_at ?? "",
            };
          } catch {
            return { code: "", milestone: Number.NaN, created_at: item.created_at ?? "" };
          }
        })
        .filter((item: { code: string }) => item.code)
    : [];

  const activeReward = rewards.length ? rewards[rewards.length - 1] : null;

  return {
    referral_count: referralCount,
    milestone: REWARD_MILESTONE,
    remaining_to_reward: progress.remaining,
    next_reward_at: progress.nextTarget,
    referral_link: buildReferralLink(req, referralCodeOrId),
    active_reward_code: activeReward?.code ?? null,
    reward_count: rewards.length,
  };
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
    .select("id, phone_number, balance_g, referrer_id, referral_code, created_at")
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
        .select("id, phone_number, balance_g, referrer_id, referral_code, created_at")
        .single();

      if (updated.error) {
        return NextResponse.json(
          { ok: false, error: "supabase_update_failed", details: updated.error.message },
          { status: 502 },
        );
      }

      user = updated.data;
    }

    const rewardCode =
      resolvedReferrerId && user.referrer_id === resolvedReferrerId
        ? await maybeIssueRewardCode(
            supabase,
            resolvedReferrerId,
            (
              await supabase
                .from("app_users")
                .select("id", { count: "exact", head: true })
                .eq("referrer_id", resolvedReferrerId)
            ).count ?? 0,
          )
        : null;

    const shareToken =
      typeof user.referral_code === "string" && user.referral_code.trim()
        ? user.referral_code.trim()
        : user.id;
    const rewardSummary = await getReferralRewardSummary(supabase, user.id, shareToken, req);

    return NextResponse.json({
      ok: true,
      user,
      created: false,
      referral_link: buildReferralLink(req, shareToken),
      reward_code_issued: rewardCode,
      reward_summary: rewardSummary,
    });
  }

  const referralCode = await buildUniqueReferralCode(supabase, `${identifier}:${Date.now()}`);
  const insertPayload: Record<string, unknown> = {
    phone_number: identifier,
    referral_code: referralCode,
    created_at: new Date().toISOString(),
  };
  if (resolvedReferrerId) insertPayload.referrer_id = resolvedReferrerId;

  const inserted = await supabase
    .from("app_users")
    .insert(insertPayload)
    .select("id, phone_number, balance_g, referrer_id, referral_code, created_at")
    .single();

  if (inserted.error) {
    return NextResponse.json(
      { ok: false, error: "supabase_insert_failed", details: inserted.error.message },
      { status: 502 },
    );
  }

  const rewardCode = resolvedReferrerId
    ? await maybeIssueRewardCode(
        supabase,
        resolvedReferrerId,
        (
          await supabase
            .from("app_users")
            .select("id", { count: "exact", head: true })
            .eq("referrer_id", resolvedReferrerId)
        ).count ?? 0,
      )
    : null;

  const rewardSummary = await getReferralRewardSummary(supabase, inserted.data.id, referralCode, req);

  return NextResponse.json({
    ok: true,
    user: inserted.data,
    created: true,
    referral_link: buildReferralLink(req, referralCode),
    reward_code_issued: rewardCode,
    reward_summary: rewardSummary,
  });
}
