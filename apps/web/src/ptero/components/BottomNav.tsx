"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AccountMenu } from "@/ptero/components/AccountMenu";
import { NavIcon } from "@/ptero/components/NavIcon";
import { useUser } from "@/ptero/context/AppState";
import { useCart } from "@/ptero/context/CartContext";
import {
  homeForMode,
  isTabActive,
  tabsForMode,
  type NavTab,
} from "@/ptero/lib/nav";
import { useRunnerEntry } from "@/lib/use-runner-entry";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, mode, setMode } = useUser();
  const runnerEntry = useRunnerEntry("cityu");
  const { itemCount } = useCart();
  const chromeMode = pathname.startsWith("/cityu/runner") ? "runner" : mode;
  const tabs = tabsForMode(chromeMode, Boolean(user && !user.isGuest));

  function onTabClick(tab: NavTab, event: React.MouseEvent) {
    if (tab.action === "switch-runner") {
      event.preventDefault();
      if (runnerEntry.loading) return;
      runnerEntry.onClick(event);
      if (runnerEntry.decision.status === "ready" && runnerEntry.decision.runner) {
        setMode("runner");
      }
      router.push(runnerEntry.href);
      return;
    }
    if (tab.action === "switch-customer") {
      event.preventDefault();
      setMode("customer");
      router.push(homeForMode("customer"));
    }
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t px-4 pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      style={{ backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}
    >
      <div className="mx-auto flex max-w-[480px] gap-2">
        {tabs.map((tab) => {
          const active = isTabActive(tab, pathname);
          const badge = tab.href === "/cityu/cart" ? itemCount : 0;
          const color = active ? "#ED1C24" : "#6b7280";
          if (tab.iconId === "profile") {
            return (
              <div
                key={`${chromeMode}-${tab.label}-${tab.href}`}
                className="flex min-h-11 min-w-11 flex-1 items-center justify-center"
              >
                <AccountMenu placement="up" avatarSize={28} label={tab.label} />
              </div>
            );
          }
          return (
            <Link
              key={`${chromeMode}-${tab.label}-${tab.href}`}
              href={
                tab.action === "switch-runner"
                  ? runnerEntry.href
                  : tab.action
                    ? "#"
                    : tab.href
              }
              aria-busy={tab.action === "switch-runner" && runnerEntry.loading ? true : undefined}
              aria-disabled={tab.action === "switch-runner" && runnerEntry.loading ? true : undefined}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              onClick={(event) => onTabClick(tab, event)}
              className={`relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-center text-[11px] font-medium leading-tight ${
                tab.action === "switch-runner" && runnerEntry.loading ? "opacity-60" : ""
              }`}
              style={{ color }}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-x-6 top-0 h-0.5 rounded-full"
                  style={{ backgroundColor: "#ED1C24" }}
                />
              ) : null}
              <span className="relative">
                <NavIcon id={tab.iconId} className="h-6 w-6" />
                {badge > 0 && (
                  <span
                    className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
                    style={{ backgroundColor: "#ED1C24", color: "#ffffff" }}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
