import type { CampusId } from "@fusion-express/shared/campus";

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
