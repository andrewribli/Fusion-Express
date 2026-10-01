/**
 * Client-side admin email allowlist for UI shortcuts (header Admin button).
 * Real security still requires /admins/{uid} for Firestore + RequireAdmin
 * (or matching allowlist email). Never treat this list alone as API auth.
 */

export const ADMIN_EMAILS = [
  "1155233599@link.cuhk.edu.hk",
  "hello@gracerun.fit",
  "andrew.ribli@gmail.com",
] as const;

const ADMIN_EMAIL_SET = new Set(
  ADMIN_EMAILS.map((e) => e.trim().toLowerCase()),
);

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAIL_SET.has(email.trim().toLowerCase());
}
