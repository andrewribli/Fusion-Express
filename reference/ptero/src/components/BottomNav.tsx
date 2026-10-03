"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NavIcon } from "@/components/NavIcon";
import { useUser } from "@/context/AppState";
import { useCart } from "@/context/CartContext";
import {
  homeForMode,
  isTabActive,
  runnerEntryHref,
  tabsForMode,
  type NavTab,
} from "@/lib/nav";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, mode, setMode, canRunnerMode } = useUser();
  const { itemCount } = useCart();
  const chromeMode = pathname.startsWith("/runner") ? "runner" : mode;
  const tabs = tabsForMode(chromeMode, Boolean(user && !user.isGuest));

  function onTabClick(tab: NavTab, event: React.MouseEvent) {
    if (tab.action === "switch-runner") {
      event.preventDefault();
      const href = runnerEntryHref({
        loggedIn: Boolean(user && !user.isGuest),
        canRunnerMode,
      });
      if (canRunnerMode) setMode("runner");
      router.push(href);
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
      className="fixed inset-x-0 bottom-0 z-50 border-t md:hidden"
      style={{ backgroundColor: "#ffffff", borderColor: "#e5e7eb" }}
    >
      <div className="mx-auto flex max-w-[480px]">
        {tabs.map((tab) => {
          const active = isTabActive(tab, pathname);
          const badge = tab.href === "/cart" ? itemCount : 0;
          const color = active ? "#ED1C24" : "#6b7280";
          return (
            <Link
              key={`${chromeMode}-${tab.label}-${tab.href}`}
              href={tab.action ? "#" : tab.href}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              onClick={(event) => onTabClick(tab, event)}
              className="relative flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-center text-[10px] font-medium leading-tight"
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
