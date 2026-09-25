import type { CampusId } from "@fusion-express/shared/campus";

/**
 * Last campus the browser remembered. This is a hint for guest checkout
 * chrome only. It is not a signed-in session. CityU sign-out used to leave
 * it stuck on `cityu`, and `/` then kept opening the CityU shop.
 */
export const CAMPUS_STORAGE_KEY = "gracerun_campus";

/** Drop the remembered campus. Call this on every sign-out. */
export function clearStoredCampusPreference(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CAMPUS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Campus implied by the URL. Route wins over profile/localStorage so CUHK
 * shop paths never show CityU (Ptero) chrome and vice versa.
 */
export function campusFromPathname(pathname: string): CampusId | null {
  if (pathname === "/cityu" || pathname.startsWith("/cityu/")) {
    return "cityu";
  }

  if (
    pathname === "/cuhk" ||
    pathname === "/fusion" ||
    pathname.startsWith("/canteen") ||
    pathname.startsWith("/browse") ||
    pathname === "/menu" ||
    pathname === "/cart" ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/runner") ||
    pathname === "/profile"
  ) {
    return "cuhk";
  }

  return null;
}
