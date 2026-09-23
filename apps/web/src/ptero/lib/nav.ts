import type { AppMode } from "@/ptero/lib/types";

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
  { href: "/cityu", label: "Home", iconId: "home", match: ["/", "/cityu/taste", "/cityu/canteen", "/cityu/category"] },
  { href: "/cityu/canteen", label: "Canteen", iconId: "category", match: ["/cityu/canteen"] },
  { href: "/cityu/orders", label: "Orders", iconId: "track", match: ["/cityu/track", "/cityu/pay"] },
  {
    href: "#runner",
    label: "Runner",
    iconId: "runner",
    action: "switch-runner",
  },
  { href: "/cityu/cart", label: "Cart", iconId: "cart", match: ["/cityu/checkout"] },
  { href: "/cityu/profile", label: "Account", iconId: "profile", match: ["/cityu/login"] },
];

export const GUEST_TABS: NavTab[] = [
  { href: "/cityu", label: "Home", iconId: "home", match: ["/", "/cityu/taste", "/cityu/canteen", "/cityu/category"] },
  { href: "/cityu/canteen", label: "Canteen", iconId: "category", match: ["/cityu/canteen"] },
  { href: "/cityu/orders", label: "Orders", iconId: "track", match: ["/cityu/track", "/cityu/pay"] },
  {
    href: "#runner",
    label: "Runner",
    iconId: "runner",
    action: "switch-runner",
  },
  { href: "/cityu/cart", label: "Cart", iconId: "cart", match: ["/cityu/checkout"] },
  { href: "/cityu/login", label: "Account", iconId: "profile" },
];

export const RUNNER_TABS: NavTab[] = [
  {
    href: "#customer",
    label: "Shop",
    iconId: "home",
    action: "switch-customer",
  },
  { href: "/cityu/runner/dashboard", label: "Available", iconId: "available" },
  { href: "/cityu/runner/deliveries", label: "Deliveries", iconId: "deliveries" },
  { href: "/cityu/runner/profile", label: "Profile", iconId: "profile" },
];

export function tabsForMode(mode: AppMode, loggedIn: boolean): NavTab[] {
  if (mode === "runner") return RUNNER_TABS;
  return loggedIn ? CUSTOMER_TABS : GUEST_TABS;
}

export function isTabActive(tab: NavTab, pathname: string): boolean {
  if (tab.action) return false;
  if (pathname === tab.href) return true;
  for (const prefix of tab.match ?? []) {
    if (prefix === "/" ? pathname === "/cityu" : pathname.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

export function isRunnerPath(pathname: string): boolean {
  return pathname.startsWith("/cityu/runner");
}

export function homeForMode(mode: AppMode): string {
  return mode === "runner" ? "/cityu/runner/dashboard" : "/cityu";
}

export function runnerEntryHref(opts: {
  loggedIn: boolean;
  canRunnerMode: boolean;
}): string {
  if (opts.canRunnerMode) return "/cityu/runner/dashboard";
  if (opts.loggedIn) return "/cityu/runner/register";
  return "/cityu/runner";
}
