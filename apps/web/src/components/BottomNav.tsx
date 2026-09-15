"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NavIcon } from "@/components/NavIcon";
import { useUser } from "@/context/UserContext";
import { countRunnerActiveOrders } from "@/lib/orders";
import { isTabActive, tabsForMode, type NavTab } from "@/lib/nav";
import { useActiveCustomerOrders } from "@/lib/use-active-orders";
import { useCart } from "@/context/CartContext";

const GUEST_TABS: NavTab[] = [
  { href: "/", label: "Home", iconId: "home", match: ["/", "/home"] },
  {
    href: "/browse/dry",
    label: "Category",
    iconId: "category",
    match: ["/browse", "/menu"],
  },
  { href: "/#search", label: "Search", iconId: "search" },
  { href: "/cart", label: "Cart", iconId: "cart", match: ["/checkout"] },
  { href: "/login", label: "Account", iconId: "profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, mode } = useUser();
  const { itemCount } = useCart();
  const [activeCount, setActiveCount] = useState(0);
  const customerActive = useActiveCustomerOrders();

  const runnerMode = mode === "runner";

  useEffect(() => {
    const runnerUid = user?.isRunner ? user.uid : undefined;
    if (!runnerUid) return;
    void countRunnerActiveOrders(runnerUid).then(setActiveCount);
    const interval = setInterval(() => {
      void countRunnerActiveOrders(runnerUid).then(setActiveCount);
    }, 15000);
    return () => clearInterval(interval);
  }, [user?.isRunner, user?.uid]);

  const tabs = user ? tabsForMode(mode) : GUEST_TABS;
  const accent = runnerMode ? "text-lakers-gold" : "text-[#ED1C24]";

  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur md:hidden ${
        runnerMode
          ? "border-lakers-gold/30 bg-lakers-navy/95"
          : "border-gray-200 bg-white/95"
      }`}
    >
      <div className="mx-auto flex max-w-[480px]">
        {tabs.map((tab) => {
          const active =
            tab.href === "/#search"
              ? false
              : isTabActive(tab, pathname);
          const isTrack = tab.href === "/track";
          const isSearch = tab.href === "/#search";
          const badge =
            tab.href === "/runner/deliveries"
              ? activeCount
              : isTrack
                ? customerActive.count
                : tab.href === "/cart"
                  ? itemCount
                  : 0;
          return (
            <Link
              key={tab.href}
              href={isTrack ? customerActive.href : isSearch ? "/" : tab.href}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              onClick={(event) => {
                if (!isSearch) return;
                event.preventDefault();
                if (pathname !== "/") {
                  router.push("/#search");
                  return;
                }
                document.getElementById("home-search")?.focus();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`relative flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-center text-[10px] leading-tight ${
                active
                  ? `font-semibold ${accent}`
                  : runnerMode
                    ? "font-medium text-white/70"
                    : "font-medium text-gray-600"
              }`}
            >
              {active ? (
                <span
                  aria-hidden
                  className={`absolute inset-x-6 top-0 h-0.5 rounded-full ${
                    runnerMode ? "bg-lakers-gold" : "bg-[#ED1C24]"
                  }`}
                />
              ) : null}
              <span className="relative">
                <NavIcon id={tab.iconId} className="h-6 w-6" />
                {badge > 0 && (
                  <span
                    className={`absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                      runnerMode
                        ? "bg-lakers-gold text-lakers-navy"
                        : "bg-[#ED1C24] text-white"
                    }`}
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
