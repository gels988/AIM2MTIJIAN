import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  buildRewardClaimSource,
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

async function resolveOwner(supabase: any, ownerToken: string) {
  const normalized = ownerToken.trim();
  if (!normalized) return null;

  for (const [field, value] of [
    ["id", normalized],
    ["referral_code", normalized],
    ["phone_number", normalized],
  ] as const) {
    const result = await supabase
      .from("app_users")
      .select("id, phone_number, referral_code, created_at")
      .eq(field, value)
      .maybeSingle();
    if (!result.error && result.data) {
      return result.data as {
        id: string;
        phone_number: string;
        referral_code: string | null;
        created_at: string;
      };
    }
  }

  return null;
}

export async function GET(req: Request) {
  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.json({ ok: false, error: "supabase_env_missing" }, { status: 500 });
  }

  const url = new URL(req.url);
  const ownerToken = url.searchParams.get("owner")?.trim() ?? "";
  if (!ownerToken) {
    return NextResponse.json({ ok: false, error: "owner_required" }, { status: 400 });
  }

  const supabase = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const owner = await resolveOwner(supabase, ownerToken);
  if (!owner) {
    return NextResponse.json({ ok: false, error: "owner_not_found" }, { status: 404 });
  }

  const referralCountResult = await supabase
    .from("app_users")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", owner.id);

  if (referralCountResult.error) {
    return NextResponse.json(
      { ok: false, error: "referral_count_failed", details: referralCountResult.error.message },
      { status: 502 },
    );
  }

  const rewardEvents = await supabase
    .from("heartbeat_events")
    .select("source, note, created_at")
    .like("source", `reward:${owner.id}:%`);

  if (rewardEvents.error) {
    return NextResponse.json(
      { ok: false, error: "reward_query_failed", details: rewardEvents.error.message },
      { status: 502 },
    );
  }

  const rewards = (rewardEvents.data ?? [])
    .map((item: { source?: string; note?: string | null; created_at?: string }) => {
      let parsed: { code?: string; milestone?: number } = {};
      try {
        parsed = JSON.parse(item.note ?? "{}") as { code?: string; milestone?: number };
      } catch {
        parsed = {};
      }
      return {
        code: typeof parsed.code === "string" ? parsed.code : "",
        milestone: typeof parsed.milestone === "number" ? parsed.milestone : 0,
        created_at: item.created_at ?? "",
      };
    })
    .filter((item) => item.code);

  const unclaimedRewards: Array<{ code: string; milestone: number; created_at: string }> = [];
  for (const reward of rewards) {
    const claim = await supabase
      .from("heartbeat_events")
      .select("id")
      .eq("source", buildRewardClaimSource(reward.code))
      .maybeSingle();
    if (!claim.error && !claim.data) {
      unclaimedRewards.push(reward);
    }
  }

  const referralCount =
    typeof referralCountResult.count === "number" ? referralCountResult.count : 0;
  const progress = getRewardProgress(referralCount, REWARD_MILESTONE);
  const origin = url.origin;

  return NextResponse.json({
    ok: true,
    owner: {
      id: owner.id,
      identifier: owner.phone_number,
      referral_code: owner.referral_code,
      referral_link: buildShortReferralLink(origin, owner.referral_code || owner.id),
    },
    referral_count: referralCount,
    milestone: REWARD_MILESTONE,
    remaining_to_reward: progress.remaining,
    next_reward_at: progress.nextTarget,
    reward_count: rewards.length,
    active_reward_code: unclaimedRewards.length ? unclaimedRewards[0].code : null,
    rewards: rewards.map((reward) => ({
      ...reward,
      claimed: !unclaimedRewards.some((item) => item.code === reward.code),
    })),
  });
}
