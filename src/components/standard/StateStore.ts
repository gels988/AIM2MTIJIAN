export type StorageValue = string | number | boolean | null | object;

function hasWindow() {
  return typeof window !== "undefined";
}

export function getString(key: string): string | null {
  if (!hasWindow()) return null;
  return window.localStorage.getItem(key);
}

export function setString(key: string, value: string) {
  if (!hasWindow()) return;
  window.localStorage.setItem(key, value);
}

export function removeKey(key: string) {
  if (!hasWindow()) return;
  window.localStorage.removeItem(key);
}

export function getJson<T>(key: string): T | null {
  const raw = getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setJson(key: string, value: StorageValue) {
  setString(key, JSON.stringify(value));
}

export const AIM2M_STATUS_KEY = "AIM2M_STATUS";

export type UnlockStatus = "ACTIVE" | "INACTIVE";

export function isUnlocked(): boolean {
  return getString(AIM2M_STATUS_KEY) === "ACTIVE";
}

export function setUnlocked(active: boolean) {
  setString(AIM2M_STATUS_KEY, active ? "ACTIVE" : "INACTIVE");
}
