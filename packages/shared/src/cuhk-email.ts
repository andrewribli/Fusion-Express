/**
 * CUHK email validation.
 *
 * Students authenticate with their CUHK-issued address. Undergraduate and
 * postgraduate students use `<sid>@link.cuhk.edu.hk`; staff and departmental
 * mailboxes use `<name>@cuhk.edu.hk`. Both are accepted so runners and
 * customers can sign in with the address CUHK gave them.
 */

const CUHK_EMAIL_DOMAINS = ["link.cuhk.edu.hk", "cuhk.edu.hk"] as const;

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Domains (lowercased) that count as a valid CUHK address. */
export function cuhkEmailDomains(): readonly string[] {
  return CUHK_EMAIL_DOMAINS;
}

/** True when the address belongs to a CUHK domain. */
export function isCuhkStudentEmail(email: string): boolean {
  return validateCuhkStudentEmail(email) === null;
}

/**
 * Returns `null` when `email` is a well-formed CUHK address, otherwise a
 * human-readable reason the address was rejected.
 */
export function validateCuhkStudentEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return "Enter your CUHK email";
  if (!EMAIL_SHAPE.test(normalized)) return "Enter a valid email address";

  const domain = normalized.slice(normalized.lastIndexOf("@") + 1);
  const isCuhk = CUHK_EMAIL_DOMAINS.some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
  );
  if (!isCuhk) {
    return "Use your CUHK email (@link.cuhk.edu.hk)";
  }
  return null;
}
