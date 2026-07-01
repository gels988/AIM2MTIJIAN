export const AIM2M_STATUS_KEY = "AIM2M_STATUS";
export const AIM2M_ACTIVATION_NOTICE_KEY = "AIM2M_ACTIVATION_NOTICE";

export type UnlockStatus = "ACTIVE" | "INACTIVE";

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
