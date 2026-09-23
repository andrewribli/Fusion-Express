"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AccountMenu } from "@/ptero/components/AccountMenu";
import { AppLogo } from "@/ptero/components/AppLogo";
import { CustomerNotificationBell } from "@/ptero/components/CustomerNotificationBell";
import { NavIcon } from "@/ptero/components/NavIcon";
import { RunnerQueueBell } from "@/ptero/components/RunnerQueueBell";
import { CAMPUS } from "@/ptero/config/campus";
import { useCart } from "@/ptero/context/CartContext";
import { useUser } from "@/ptero/context/AppState";
import { isOverOrderLimit } from "@/ptero/lib/constants";
import {
  homeForMode,
  isTabActive,
  runnerEntryHref,
  tabsForMode,
  type NavTab,
} from "@/ptero/lib/nav";

export function AppHeader({
  showBack,
  backHref,
  title,
}: {
  showBack?: boolean;
  backHref?: string;
  title?: string;
}) {
  const { itemCount, subtotal } = useCart();
  const overLimit = isOverOrderLimit(subtotal);
  const { user, mode, setMode, canRunnerMode } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const chromeMode = pathname.startsWith("/cityu/runner") ? "runner" : mode;
  const runnerMode = chromeMode === "runner";
  const tabs = tabsForMode(chromeMode, Boolean(user && !user.isGuest));
  const home = homeForMode(chromeMode);
  const pageLabel = title ?? CAMPUS.brandName;

  const navLink = (active: boolean) =>
    `hidden h-11 w-11 items-center justify-center rounded-full md:inline-flex ${
      active
        ? "bg-red-50 text-[#ED1C24]"
        : "text-gray-600 hover:bg-gray-100 hover:text-[#ED1C24]"
    }`;

  function onTabClick(tab: NavTab, event: React.MouseEvent) {
    if (tab.action === "switch-runner") {
      event.preventDefault();
      const href = runnerEntryHref({
        loggedIn: Boolean(user && !user.isGuest),
        canRunnerMode,
      });
      if (canRunnerMode) setMode("runner");
      router.push(href);
    }
    if (tab.action === "switch-customer") {
      event.preventDefault();
      setMode("customer");
      router.push(homeForMode("customer"));
    }
  }

  return (
    <>
      {runnerMode && (
        <div className="bg-emerald-600 px-4 py-1.5 text-center text-xs font-semibold text-white">
          Runner mode — {CAMPUS.brandName}
        </div>
      )}
      <header className="sticky top-0 z-50 overflow-visible border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {showBack && (
              <Link
                href={backHref ?? home}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]"
                aria-label="Go back"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                  <path
                    d="M15 6L9 12l6 6"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            )}
            <Link
              href={runnerMode ? home : "/cityu"}
              className="flex shrink-0 items-center justify-center"
              aria-label={`${CAMPUS.brandName} home`}
            >
              <AppLogo size={48} className="h-12 w-12" />
            </Link>
            <span className="hidden max-w-44 truncate rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-[#ED1C24] sm:block">
              {pageLabel}
            </span>
          </div>

          <nav className="flex shrink-0 items-center gap-1.5">
            {!runnerMode ? (
              <Link
                href={runnerEntryHref({
                  loggedIn: Boolean(user && !user.isGuest),
                  canRunnerMode,
                })}
                onClick={() => {
                  if (canRunnerMode) setMode("runner");
                }}
                className="hidden min-h-11 items-center rounded-full border-2 border-emerald-300 bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-600 sm:inline-flex"
              >
                Switch to Runner
              </Link>
            ) : (
              <Link
                href="/cityu"
                onClick={() => setMode("customer")}
                className="hidden min-h-11 items-center rounded-full bg-[#ED1C24] px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#c9171e] sm:inline-flex"
              >
                Switch to Customer
              </Link>
            )}
            {!runnerMode && (
              <>
                <CustomerNotificationBell className="h-11 w-11 rounded-full" />
                <RunnerQueueBell className="h-11 w-11 rounded-full" />
              </>
            )}
            {tabs
              .filter(
                (tab) =>
                  tab.label !== "Account" &&
                  tab.label !== "Profile" &&
                  tab.action !== "switch-runner" &&
                  tab.action !== "switch-customer",
              )
              .map((tab) => (
                <Link
                  key={`${tab.label}-${tab.href}`}
                  href={tab.action ? "#" : tab.href}
                  onClick={(event) => onTabClick(tab, event)}
                  className={`${navLink(isTabActive(tab, pathname))} relative`}
                  aria-label={tab.label}
                >
                  <NavIcon id={tab.iconId} className="h-5 w-5" />
                </Link>
              ))}
            {!runnerMode && (
              <Link
                href={overLimit ? "/cityu" : itemCount > 0 ? "/cityu/checkout" : "/cityu/cart"}
                className={`relative flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold shadow-sm ${
                  overLimit
                    ? "cursor-not-allowed bg-gray-200 text-gray-400"
                    : "bg-fusion-red text-white"
                }`}
                aria-label="Checkout"
              >
                <NavIcon id="cart" className="h-4 w-4" />
                <span className="hidden sm:inline">Complete</span>
                {itemCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-bold text-white">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </Link>
            )}
            <div className="hidden sm:block">
              <AccountMenu />
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
