export const AIM2M_STATUS_KEY = "AIM2M_STATUS";
export const AIM2M_ACTIVATION_NOTICE_KEY = "AIM2M_ACTIVATION_NOTICE";
export const AIM2M_OWNER_PROFILE_KEY = "AIM2M_OWNER_PROFILE";
export const REWARD_MILESTONE = 3;

export type UnlockStatus = "ACTIVE" | "INACTIVE";
export type OwnerProfile = {
  userId: string;
  identifier: string;
  referralCode: string;
  referralLink: string;
};

export function normalizeActivationCode(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

export function isUnifiedActivationCodeValid(code: unknown, masterCode: unknown): boolean {
  const normalizedCode = normalizeActivationCode(code);
  const normalizedMasterCode = normalizeActivationCode(masterCode);
  return normalizedCode.length > 0 && normalizedCode === normalizedMasterCode;
}

export function isStoredUnlockStatus(value: string | null | undefined): boolean {
  return value === "ACTIVE";
}

function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36).toUpperCase();
}

export function buildReferralCode(seed: string, attempt = 0): string {
  const token = hashString(`${seed}:${attempt}`).padEnd(8, "X");
  return token.slice(0, 8);
}

export function buildShortReferralLink(origin: string, referralCode: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/r?c=${encodeURIComponent(referralCode)}`;
}

export function buildRewardActivationCode(ownerId: string, milestone: number, serial: number): string {
  const left = hashString(`${ownerId}:${milestone}:${serial}`).slice(0, 6);
  const right = hashString(`${serial}:${ownerId}:${milestone}`).slice(0, 6);
  return `FREE-${left}-${right}`;
}

export function buildRewardEventSource(ownerId: string, milestone: number, code: string): string {
  return `reward:${ownerId}:${milestone}:${normalizeActivationCode(code)}`;
}

export function buildRewardClaimSource(code: string): string {
  return `reward-claim:${normalizeActivationCode(code)}`;
}

export function getRewardProgress(referralCount: number, milestone = REWARD_MILESTONE) {
  const safeCount = Number.isFinite(referralCount) ? Math.max(0, Math.floor(referralCount)) : 0;
  const remainder = safeCount % milestone;
  const remaining = remainder === 0 ? milestone : milestone - remainder;
  const nextTarget = safeCount === 0 ? milestone : safeCount + remaining;
  return {
    referralCount: safeCount,
    milestone,
    remainder,
    remaining,
    nextTarget,
    rewardEarnedNow: safeCount > 0 && remainder === 0,
  };
}
