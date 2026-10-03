/**
 * CityU (GraceRun CityU) beta gate — temporary until public launch.
 *
 * To open CityU for everyone later, flip this to `false` (one line).
 * Do not delete call sites; they all go through `canAccessCityU()`.
 */
export const CITYU_BETA_LOCK_ENABLED = true;

/** Shown on the homepage button + tooltip while locked. Intentional copy only. */
export const CITYU_COMING_SOON_LABEL = "Coming very soon";

/**
 * Who can open CityU while `CITYU_BETA_LOCK_ENABLED` is true.
 * Student SID expires at graduation — keep permanent operator emails too.
 */
export const CITYU_BETA_ALLOWLIST = [
  "1155233599@link.cuhk.edu.hk",
  "andrew.ribli@gmail.com",
  "hello@gracerun.fit",
] as const;

const ALLOWED = new Set(
  CITYU_BETA_ALLOWLIST.map((email) => email.toLowerCase()),
);

/**
 * Single check used by homepage, route guard, login, and order create.
 * When the lock is off, always returns true (signed-out guests included).
 */
export function canAccessCityU(userEmail: string | null | undefined): boolean {
  if (!CITYU_BETA_LOCK_ENABLED) return true;
  if (!userEmail) return false;
  return ALLOWED.has(userEmail.trim().toLowerCase());
}

/** Non-allowlisted visitors must not stay on `/cityu/*`. */
export function cityuBetaRedirect(
  pathname: string,
  userEmail: string | null | undefined,
): string | null {
  if (!pathname.startsWith("/cityu")) return null;
  // Admin directory is gated by RequireAdmin, same as /admin.
  if (pathname === "/cityu/admin" || pathname.startsWith("/cityu/admin/")) {
    return null;
  }
  if (canAccessCityU(userEmail)) return null;
  return "/";
}
