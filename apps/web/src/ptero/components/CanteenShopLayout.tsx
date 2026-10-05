"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AccountMenu } from "@/ptero/components/AccountMenu";
import { AppLogo } from "@/ptero/components/AppLogo";
import { CartSidebar } from "@/ptero/components/CartSidebar";
import { CustomerNotificationBell } from "@/ptero/components/CustomerNotificationBell";
import { FeedbackButton } from "@/ptero/components/FeedbackButton";
import { CartDropdown } from "@/ptero/components/CartDropdown";
import { PreviousOrderChecklist } from "@/ptero/components/PreviousOrderChecklist";
import { TrackOrderHeaderButton } from "@/ptero/components/TrackOrderHeaderButton";
import { CAMPUS } from "@/ptero/config/campus";
import { useUser } from "@/ptero/context/AppState";
import { useRunnerEntry } from "@/lib/use-runner-entry";

type Props = {
  deliveryLabel?: string;
  searchPlaceholder?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  /** Replace the default search input (e.g. shared MealSearch). */
  searchSlot?: ReactNode;
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
  search = "",
  onSearchChange,
  searchSlot,
  sidebar,
  mobileSidebarTitle = "Canteens",
  children,
}: Props) {
  const { setMode } = useUser();
  const runnerEntry = useRunnerEntry("cityu");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F0F7F2]">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 sm:px-4">
          <Link
            href="/cityu"
            className="hidden max-h-5 shrink-0 items-center text-[13px] font-extrabold leading-5 tracking-tight text-gray-900 min-[361px]:inline-flex sm:hidden"
            aria-label={`${CAMPUS.brandName} home`}
          >
            {CAMPUS.brandName}
          </Link>
          <Link
            href="/cityu"
            className="hidden shrink-0 items-center gap-2 sm:flex"
            aria-label={`${CAMPUS.brandName} home`}
          >
            <AppLogo size={36} className="h-9 w-9" />
            <span className="text-sm font-extrabold tracking-tight text-gray-900">
              {CAMPUS.brandName}
            </span>
          </Link>
          <div className="hidden min-w-0 max-w-[240px] flex-1 md:block xl:max-w-[320px]">
            <p className="truncate rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800">
              {deliveryLabel}
            </p>
          </div>
          <div className="flex min-w-[140px] flex-1 items-center gap-2 md:min-w-[400px] md:max-w-xl">
            {searchSlot ?? (
              <input
                type="search"
                value={search}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-4 text-sm outline-none focus:border-[#ED1C24] sm:h-11"
              />
            )}
            <Link
              href={runnerEntry.href}
              aria-busy={runnerEntry.loading || undefined}
              aria-disabled={runnerEntry.loading || undefined}
              onClick={(event) => {
                if (runnerEntry.loading) {
                  event.preventDefault();
                  return;
                }
                runnerEntry.onClick(event);
                if (runnerEntry.decision.status === "ready" && runnerEntry.decision.runner) {
                  setMode("runner");
                }
              }}
              className={`hidden rounded-full border-2 border-emerald-300 bg-emerald-500 px-3 py-2 text-xs font-bold text-white sm:inline-flex ${
                runnerEntry.loading ? "opacity-60" : ""
              }`}
            >
              Runner
            </Link>
            <div className="hidden sm:block">
              <CustomerNotificationBell className="!h-11 !w-11 !rounded-full" />
            </div>
            <TrackOrderHeaderButton />
            <CartDropdown
              browseHref="/cityu/canteen"
              cartHref="/cityu/cart"
              checkoutHref="/cityu/checkout"
              flatDeliveryFee
            />
            <div className="flex h-11 w-11 shrink-0 items-center justify-center">
              <AccountMenu />
            </div>
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

        <div className="min-w-0 pb-[calc(12rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
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

      <FeedbackButton />
    </div>
  );
}
