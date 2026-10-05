import type { AppMode } from "@/lib/types";

export interface NavTab {
  href: string;
  label: string;
  iconId:
    | "home"
    | "track"
    | "cart"
    | "profile"
    | "available"
    | "deliveries"
    | "orders"
    | "earnings"
    | "search"
    | "category"
    | "add"
    | "runner";
  match?: string[];
  action?: "switch-runner" | "switch-customer";
}

export const CUSTOMER_TABS: NavTab[] = [
  { href: "/", label: "Home", iconId: "home", match: ["/", "/taste", "/canteen", "/category"] },
  { href: "/canteen", label: "Canteen", iconId: "category", match: ["/canteen"] },
  { href: "/orders", label: "Orders", iconId: "track", match: ["/track", "/pay"] },
  {
    href: "#runner",
    label: "Runner",
    iconId: "runner",
    action: "switch-runner",
  },
  { href: "/cart", label: "Cart", iconId: "cart", match: ["/checkout"] },
  { href: "/profile", label: "Account", iconId: "profile", match: ["/login"] },
];

export const GUEST_TABS: NavTab[] = [
  { href: "/", label: "Home", iconId: "home", match: ["/", "/taste", "/canteen", "/category"] },
  { href: "/canteen", label: "Canteen", iconId: "category", match: ["/canteen"] },
  { href: "/orders", label: "Orders", iconId: "track", match: ["/track", "/pay"] },
  {
    href: "#runner",
    label: "Runner",
    iconId: "runner",
    action: "switch-runner",
  },
  { href: "/cart", label: "Cart", iconId: "cart", match: ["/checkout"] },
  { href: "/login", label: "Account", iconId: "profile" },
];

export const RUNNER_TABS: NavTab[] = [
  {
    href: "#customer",
    label: "Shop",
    iconId: "home",
    action: "switch-customer",
  },
  { href: "/runner/dashboard", label: "Available", iconId: "available" },
  { href: "/runner/deliveries", label: "Deliveries", iconId: "deliveries" },
  { href: "/runner/profile", label: "Profile", iconId: "profile" },
];

export function tabsForMode(mode: AppMode, loggedIn: boolean): NavTab[] {
  if (mode === "runner") return RUNNER_TABS;
  return loggedIn ? CUSTOMER_TABS : GUEST_TABS;
}

export function isTabActive(tab: NavTab, pathname: string): boolean {
  if (tab.action) return false;
  if (pathname === tab.href) return true;
  for (const prefix of tab.match ?? []) {
    if (prefix === "/" ? pathname === "/" : pathname.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

export function isRunnerPath(pathname: string): boolean {
  return pathname.startsWith("/runner");
}

export function homeForMode(mode: AppMode): string {
  return mode === "runner" ? "/runner/dashboard" : "/";
}

export function runnerEntryHref(opts: {
  loggedIn: boolean;
  canRunnerMode: boolean;
}): string {
  if (opts.canRunnerMode) return "/runner/dashboard";
  if (opts.loggedIn) return "/runner/register";
  return "/runner";
}
