"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NavIcon } from "@/components/NavIcon";
import { useUser } from "@/context/UserContext";
import { countRunnerActiveOrders } from "@/lib/orders";
import {
  homeForMode,
  isTabActive,
  runnerEntryHref,
  tabsForMode,
  type NavTab,
} from "@/lib/nav";
import { useActiveCustomerOrders } from "@/lib/use-active-orders";
import { useCart } from "@/context/CartContext";
import { useManualItemModal } from "@/lib/manual-item-modal";
import { navModeForPath, useModeSync } from "@/lib/use-mode-sync";

const GUEST_TABS: NavTab[] = [
  { href: "/", label: "Home", iconId: "home", match: ["/", "/home"] },
  { href: "#add", label: "Add", iconId: "add", action: "manual-add" },
  {
    href: "#runner",
    label: "Runner",
    iconId: "runner",
    action: "switch-runner",
  },
  { href: "/cart", label: "Cart", iconId: "cart", match: ["/checkout"] },
  { href: "/login", label: "Account", iconId: "profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, mode, setMode, canRunnerMode } = useUser();
  const { itemCount } = useCart();
  const { openManualItem } = useManualItemModal();
  const [activeCount, setActiveCount] = useState(0);
  const customerActive = useActiveCustomerOrders();

  useModeSync();

  const chromeMode = navModeForPath(pathname, mode);

  useEffect(() => {
    const runnerUid = user?.isRunner ? user.uid : undefined;
    if (!runnerUid) return;
    void countRunnerActiveOrders(runnerUid).then(setActiveCount);
    const interval = setInterval(() => {
      void countRunnerActiveOrders(runnerUid).then(setActiveCount);
    }, 15000);
    return () => clearInterval(interval);
  }, [user?.isRunner, user?.uid]);

  const tabs = user ? tabsForMode(chromeMode) : GUEST_TABS;

  function onTabClick(tab: NavTab, event: React.MouseEvent) {
    if (tab.action === "manual-add") {
      event.preventDefault();
      openManualItem();
      return;
    }
    if (tab.action === "switch-runner") {
      event.preventDefault();
      const href = runnerEntryHref({
        loggedIn: Boolean(user),
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
      style={{
        backgroundColor: "#ffffff",
        borderColor: "#e5e7eb",
      }}
    >
      <div className="mx-auto flex max-w-[480px]">
        {tabs.map((tab) => {
          const active = isTabActive(tab, pathname);
          const isTrack = tab.href === "/track";
          const badge =
            tab.href === "/runner/deliveries"
              ? activeCount
              : isTrack
                ? customerActive.count
                : tab.href === "/cart"
                  ? itemCount
                  : 0;
          const color = active ? "#ED1C24" : "#6b7280";
          return (
            <Link
              key={`${chromeMode}-${tab.label}-${tab.href}`}
              href={
                isTrack
                  ? customerActive.href
                  : tab.action
                    ? "#"
                    : tab.href
              }
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              onClick={(event) => onTabClick(tab, event)}
              className="relative flex min-h-[3.5rem] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-center text-[10px] font-medium leading-tight"
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
