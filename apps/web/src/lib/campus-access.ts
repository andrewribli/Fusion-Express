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
 * Campus for route isolation. Email domain only — never a stored profile
 * campus, cookie, or `gracerun_campus` value.
 * @link.cuhk.edu.hk / @cuhk.edu.hk → CUHK.
 * @cityu.edu.hk / @my.cityu.edu.hk → CityU.
 * Guests, signed-out visitors, and addresses outside those domains are
 * unrestricted.
 */
export function accessCampusForUser(user: UserProfile | null | undefined): CampusId | null {
  if (!user?.uid || user.isGuest || !user.email) return null;
  return detectCampusFromEmail(user.email);
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
