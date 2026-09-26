import type { CampusId } from "@fusion-express/shared/campus";

/**
 * Retired key. Campus is the URL, or the signed-in email domain.
 * Nothing should write this again.
 */
export const CAMPUS_STORAGE_KEY = "gracerun_campus";

/** Delete leftover last-used campus memory (storage and cookie). */
export function clearStoredCampusPreference(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CAMPUS_STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    sessionStorage.removeItem(CAMPUS_STORAGE_KEY);
  } catch {
    // ignore
  }
  try {
    const host = window.location.hostname;
    const bases = [
      `${CAMPUS_STORAGE_KEY}=; Max-Age=0; path=/`,
      `${CAMPUS_STORAGE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`,
    ];
    const domains = ["", host, host.startsWith("www.") ? host.slice(4) : ""];
    if (host.endsWith("gracerun.fit")) domains.push(".gracerun.fit");
    for (const base of bases) {
      document.cookie = base;
      for (const domain of domains) {
        if (!domain) continue;
        document.cookie = `${base}; domain=${domain}`;
      }
    }
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
