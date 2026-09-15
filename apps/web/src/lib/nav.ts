import type { AppMode } from "@/lib/roles";

export interface NavTab {
  href: string;
  label: string;
  /** Stable id for SVG icon mapping. */
  iconId: "home" | "track" | "cart" | "profile" | "available" | "deliveries" | "orders" | "earnings" | "search" | "category";
  /** Extra prefixes that should light this tab up. */
  match?: string[];
}

export const CUSTOMER_TABS: NavTab[] = [
  { href: "/", label: "Home", iconId: "home", match: ["/", "/home"] },
  {
    href: "/browse/dry",
    label: "Category",
    iconId: "category",
    match: ["/browse", "/menu"],
  },
  { href: "/#search", label: "Search", iconId: "search" },
  { href: "/cart", label: "Cart", iconId: "cart", match: ["/checkout"] },
  { href: "/profile", label: "Account", iconId: "profile" },
];

export const RUNNER_TABS: NavTab[] = [
  { href: "/runner/dashboard", label: "Available", iconId: "available" },
  {
    href: "/runner/deliveries",
    label: "Deliveries",
    iconId: "deliveries",
    match: ["/runner/expired"],
  },
  { href: "/orders", label: "Orders", iconId: "orders" },
  { href: "/runner/earnings", label: "Earnings", iconId: "earnings" },
  { href: "/runner/profile", label: "Profile", iconId: "profile" },
];

export function tabsForMode(mode: AppMode): NavTab[] {
  return mode === "runner" ? RUNNER_TABS : CUSTOMER_TABS;
}

export function isTabActive(tab: NavTab, pathname: string): boolean {
  if (pathname === tab.href) return true;
  for (const prefix of tab.match ?? []) {
    if (prefix === "/" ? pathname === "/" : pathname.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

/** Runner-only section. Everything else is customer-facing or shared. */
export function isRunnerPath(pathname: string): boolean {
  return pathname.startsWith("/runner");
}

/** Shop pages a runner should never be dropped into while in runner mode. */
export function isShopPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/home" ||
    pathname.startsWith("/browse") ||
    pathname.startsWith("/menu") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/checkout")
  );
}

export function homeForMode(mode: AppMode): string {
  return mode === "runner" ? "/runner/dashboard" : "/";
}
