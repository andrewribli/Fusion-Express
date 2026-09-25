import {
  getCampusConfig,
  isCampusId,
  isOwnerLoginEmail,
  resolveCampus,
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

/** Where to send the user after sign-in / sign-up (honors ?next= when safe). */
export function postLoginDestination(opts: {
  campus?: CampusId | null;
  next?: string | null;
}): string {
  if (isSafePostLoginNext(opts.next)) return opts.next;
  if (isCampusId(opts.campus)) return campusHubPath(opts.campus);
  return "/";
}

/** Campus used for route isolation; guests and browse-only sessions are unrestricted. */
export function accessCampusForUser(user: UserProfile | null | undefined): CampusId | null {
  if (!user || user.isGuest) return null;
  return resolveCampus(user.campus);
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
