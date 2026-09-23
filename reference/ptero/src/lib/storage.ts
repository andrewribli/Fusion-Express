const PREFIX = "gracerun_cityu_";

export const STORAGE_KEYS = {
  cart: `${PREFIX}cart`,
  session: `${PREFIX}session`,
  users: `${PREFIX}users`,
  orders: `${PREFIX}orders`,
  currentUser: `${PREFIX}current_user`,
  mode: `${PREFIX}mode`,
  notifications: `${PREFIX}notifications`,
  emailOutbox: `${PREFIX}email_outbox`,
} as const;

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("gracerun-cityu-sync"));
}
