import {
  detectCampusFromEmail,
  getCampusConfig,
  isCampusId,
  isOwnerLoginEmail,
  type CampusId,
} from "@fusion-express/shared/campus";
import type { UserProfile } from "@/context/UserContext";
import { campusFromPathname } from "@/lib/campus-routes";

/** Signed-in home hub for a campus (`/cuhk` or `/cityu`). */
export function campusHubPath(campus: CampusId): string {
  return getCampusConfig(campus).channelHomePath;
}

export function isSafePostLoginNext(next: string | null | undefined): next is string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return false;
  if (next.startsWith("/login") || next.startsWith("/signin")) return false;
  if (next.startsWith("/cityu/login")) return false;
  return true;
}

/**
 * Where to send the user after sign-in / sign-up.
 * The email's campus wins. A `?next=` path on the other campus is ignored
 * so a CUHK address never lands in the CityU shop (and the reverse).
 */
export function postLoginDestination(opts: {
  campus?: CampusId | null;
  next?: string | null;
}): string {
  const campus = isCampusId(opts.campus) ? opts.campus : null;
  if (isSafePostLoginNext(opts.next)) {
    const nextCampus = campusFromPathname(opts.next);
    if (!campus || !nextCampus || nextCampus === campus) return opts.next;
  }
  if (campus) return campusHubPath(campus);
  return "/";
}

/**
 * Campus for route isolation. Guests and signed-out visitors are
 * unrestricted — do not pass localStorage `gracerun_campus` in here.
 * A missing profile campus is not a campus (do not guess CityU or CUHK).
 * University email domain wins over a stored profile campus, so a CUHK
 * address stays CUHK even if an older session wrote `campus: cityu`.
 */
export function accessCampusForUser(user: UserProfile | null | undefined): CampusId | null {
  if (!user?.uid || user.isGuest) return null;
  if (user.email) {
    const fromEmail = detectCampusFromEmail(user.email);
    if (fromEmail) return fromEmail;
  }
  return isCampusId(user.campus) ? user.campus : null;
}

/** Admins (Firestore /admins) and the CityU owner login may cross campuses. */
export function bypassesCampusIsolation(
  user: UserProfile | null | undefined,
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (user?.email && isOwnerLoginEmail(user.email)) return true;
  return false;
}

const NEUTRAL_PREFIXES = [
  "/login",
  "/signin",
  "/admin",
  "/track",
  "/privacy",
  "/terms",
  "/api",
] as const;

/** Paths that are not tied to one campus (marketing, auth, admin, legal). */
export function isCampusNeutralPath(pathname: string): boolean {
  if (pathname === "/") return true;
  for (const prefix of NEUTRAL_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

/**
 * If the signed-in user may not view this path, returns their hub path to redirect to.
 * Otherwise null.
 */
export function campusAccessRedirect(
  pathname: string,
  userCampus: CampusId,
  bypass: boolean,
): string | null {
  if (bypass) return null;
  if (isCampusNeutralPath(pathname)) return null;
  const routeCampus = campusFromPathname(pathname);
  if (!routeCampus || routeCampus === userCampus) return null;
  return campusHubPath(userCampus);
}
