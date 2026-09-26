/**
 * Hard-coded ops allowlist. Admin UI + /admin API routes must match this
 * (in addition to a Firestore /admins/{uid} doc when required by the route).
 */
export const ADMIN_ALLOWLIST_EMAILS = [
  "andrew.ribli@gmail.com",
  "1155233599@link.cuhk.edu.hk",
] as const;

export function normalizeAdminEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isAdminAllowlistEmail(
  email: string | null | undefined,
): boolean {
  const normalized = normalizeAdminEmail(email);
  if (!normalized) return false;
  return (ADMIN_ALLOWLIST_EMAILS as readonly string[]).includes(normalized);
}

/** HttpOnly cookie set after a successful admin session check. */
export const ADMIN_SESSION_COOKIE = "gracerun_admin_session";
