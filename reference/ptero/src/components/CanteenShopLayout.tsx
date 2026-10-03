"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { AppLogo } from "@/components/AppLogo";
import { CartSidebar } from "@/components/CartSidebar";
import { CustomerNotificationBell } from "@/components/CustomerNotificationBell";
import { FeedbackButton } from "@/components/FeedbackButton";
import { OrderActionBar } from "@/components/OrderActionBar";
import { PreviousOrderChecklist } from "@/components/PreviousOrderChecklist";
import { RunnerQueueBell } from "@/components/RunnerQueueBell";
import { TrackOrderFab } from "@/components/TrackOrderFab";
import { CAMPUS } from "@/config/campus";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/AppState";
import { isOverOrderLimit } from "@/lib/constants";
import { runnerEntryHref } from "@/lib/nav";

type Props = {
  deliveryLabel?: string;
  searchPlaceholder?: string;
  search: string;
  onSearchChange: (value: string) => void;
  sidebar?: ReactNode;
  mobileSidebarTitle?: string;
  children: ReactNode;
};

/**
 * Canteen shop chrome — mirrors CUHK ShopLayout: address, search, runner,
 * notification bell, cart sidebar, previous order, feedback.
 */
export function CanteenShopLayout({
  deliveryLabel = "Deliver to CityU hall lobby · Canteen",
  searchPlaceholder = "Search menu",
  search,
  onSearchChange,
  sidebar,
  mobileSidebarTitle = "Canteens",
  children,
}: Props) {
  const { itemCount, subtotal } = useCart();
  const { user, setMode, canRunnerMode } = useUser();
  const overLimit = isOverOrderLimit(subtotal);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const checkoutHref = useMemo(() => {
    if (overLimit) return "/canteen";
    return itemCount > 0 ? "/checkout" : "/cart";
  }, [overLimit, itemCount]);

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
          <Link href="/" className="shrink-0" aria-label={`${CAMPUS.brandName} home`}>
            <AppLogo size={44} className="h-11 w-11" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800">
              {deliveryLabel}
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-[#ED1C24] sm:w-56 sm:flex-none"
            />
            <Link
              href={runnerEntryHref({
                loggedIn: Boolean(user && !user.isGuest),
                canRunnerMode,
              })}
              onClick={() => {
                if (canRunnerMode) setMode("runner");
              }}
              className="hidden rounded-full border-2 border-emerald-300 bg-emerald-500 px-3 py-2 text-xs font-bold text-white sm:inline-flex"
            >
              Runner
            </Link>
            <CustomerNotificationBell className="h-11 w-11 rounded-full" />
            <RunnerQueueBell className="h-11 w-11 rounded-full" />
            <Link
              href={checkoutHref}
              className={`relative flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${
                overLimit
                  ? "bg-gray-200 text-gray-400"
                  : "bg-[#ED1C24] text-white"
              }`}
            >
              Cart
              {itemCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-bold text-white">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
            <AccountMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white shadow-sm">
            <p className="border-b border-gray-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {mobileSidebarTitle}
            </p>
            {sidebar}
          </div>
        </aside>

        <div className="min-w-0">
          <button
            type="button"
            className="mb-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 lg:hidden"
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            {mobileNavOpen ? "Hide" : "Show"} {mobileSidebarTitle}
          </button>
          {mobileNavOpen ? (
            <div className="mb-4 rounded-2xl border border-gray-100 bg-white lg:hidden">
              {sidebar}
            </div>
          ) : null}
          {children}
        </div>

        <aside className="hidden space-y-3 lg:block">
          <div className="sticky top-24 space-y-3">
            <div className="h-[min(52vh,420px)]">
              <CartSidebar flatDeliveryFee />
            </div>
            <PreviousOrderChecklist channel="canteen" />
          </div>
        </aside>
      </div>

      <TrackOrderFab />
      <OrderActionBar />
      <FeedbackButton />
    </div>
  );
}
