"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AccountMenu } from "@/components/AccountMenu";
import { AppLogo } from "@/components/AppLogo";
import { NavIcon } from "@/components/NavIcon";
import { RunnerModeBanner } from "@/components/RunnerModeBanner";
import { RunnerQueueBell } from "@/components/RunnerQueueBell";
import { CustomerNotificationBell } from "@/components/CustomerNotificationBell";
import { useCart } from "@/context/CartContext";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";
import { isOverOrderLimit } from "@/lib/constants";
import { homeForMode, isTabActive, runnerEntryHref, tabsForMode, type NavTab } from "@/lib/nav";
import { useActiveCustomerOrders } from "@/lib/use-active-orders";
import { useManualItemModal } from "@/lib/manual-item-modal";
import { navModeForPath, useModeSync } from "@/lib/use-mode-sync";

interface AppHeaderProps {
  showBack?: boolean;
  backHref?: string;
  /** Kept so existing pages still compile; brand name is always GraceRun. */
  title?: string;
}

export function AppHeader({ showBack, backHref, title }: AppHeaderProps) {
  const { itemCount, subtotal } = useCart();
  const overLimit = isOverOrderLimit(subtotal);
  const { user, mode, setMode, canRunnerMode } = useUser();
  const { config } = useCampus();
  const brandLabel = config.brandLabel;
  const pathname = usePathname();
  const router = useRouter();
  const { openManualItem } = useManualItemModal();
  useModeSync();

  const chromeMode = navModeForPath(pathname, mode);
  const runnerMode = chromeMode === "runner";
  const tabs = tabsForMode(chromeMode);
  const customerActive = useActiveCustomerOrders();
  const home = homeForMode(chromeMode);
  const activeTab = tabs.find((tab) => isTabActive(tab, pathname));
  const pageLabel = title ?? activeTab?.label ?? brandLabel;

  const navLink = (active: boolean) =>
    `hidden h-11 w-11 items-center justify-center rounded-full md:inline-flex ${
      active
        ? "bg-red-50 text-[#ED1C24]"
        : "text-gray-600 hover:bg-gray-100 hover:text-[#ED1C24]"
    }`;

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
    <>
      {runnerMode && <RunnerModeBanner />}
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
              href={runnerMode ? home : "/"}
              className="flex min-w-0 items-center gap-2"
              aria-label={`${brandLabel} home`}
            >
              <AppLogo size={44} className="h-11 w-11 shrink-0" />
              <span className="hidden max-w-[9.5rem] truncate text-sm font-bold tracking-tight text-gray-900 sm:block">
                {brandLabel}
              </span>
              {runnerMode && (
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#ED1C24]">
                  Runner
                </span>
              )}
            </Link>
            <span
              className="hidden max-w-44 truncate rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-[#ED1C24] sm:block"
              aria-label={`Current page: ${pageLabel}`}
            >
              {pageLabel}
            </span>
          </div>

          <nav className="flex shrink-0 items-center gap-1.5">
            {!runnerMode ? (
              <Link
                href={runnerEntryHref({
                  loggedIn: Boolean(user),
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
                href="/"
                onClick={() => setMode("customer")}
                className="hidden min-h-11 items-center rounded-full bg-[#ED1C24] px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#c9171e] sm:inline-flex"
              >
                Switch to Customer
              </Link>
            )}
            {!runnerMode && (
              <>
                {canRunnerMode ? (
                  <RunnerQueueBell className="h-11 w-11 rounded-full" />
                ) : null}
                <CustomerNotificationBell className="h-11 w-11 rounded-full" />
              </>
            )}
            {tabs
              .filter(
                (tab) =>
                  tab.label !== "Profile" &&
                  tab.action !== "switch-runner" &&
                  tab.action !== "switch-customer",
              )
              .map((tab) => {
                const isTrack = tab.href === "/track";
                const href = isTrack
                  ? customerActive.href
                  : tab.action
                    ? "#"
                    : tab.href;
                return (
                  <Link
                    key={`${tab.label}-${tab.href}`}
                    href={href}
                    onClick={(event) => onTabClick(tab, event)}
                    className={`${navLink(isTabActive(tab, pathname))} relative`}
                    aria-label={tab.label}
                    aria-current={isTabActive(tab, pathname) ? "page" : undefined}
                  >
                    <NavIcon id={tab.iconId} className="h-5 w-5" />
                    {isTrack && customerActive.count > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ED1C24] px-1 text-[10px] font-bold text-white">
                        {customerActive.count > 9 ? "9+" : customerActive.count}
                      </span>
                    )}
                  </Link>
                );
              })}

            {!runnerMode && (
              <Link
                href={overLimit ? "/" : itemCount > 0 ? "/checkout" : "/cart"}
                aria-disabled={overLimit}
                className={`relative flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold shadow-sm ${
                  overLimit
                    ? "cursor-not-allowed bg-gray-200 text-gray-400"
                    : "bg-fusion-red text-white"
                }`}
                aria-label={
                  overLimit ? "Order over 200 HKD limit" : "Checkout"
                }
              >
                <NavIcon id="cart" className="h-4 w-4" />
                <span className="hidden sm:inline">Complete</span>
                {itemCount > 0 && (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      overLimit ? "bg-red-600 text-white" : "bg-gray-900 text-white"
                    }`}
                  >
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </Link>
            )}

            <AccountMenu />
          </nav>
        </div>
      </header>
    </>
  );
}
