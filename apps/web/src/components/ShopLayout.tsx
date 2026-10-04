"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";
import { AppLogo } from "@/components/AppLogo";
import { AppShell } from "@/components/AppShell";
import { GraceRunWordmark } from "@/components/GraceRunWordmark";
import { MenuCartSummary } from "@/components/MenuCartSummary";
import { OrderActionBar } from "@/components/OrderActionBar";
import { CustomerNotificationBell } from "@/components/CustomerNotificationBell";
import { RunnerQueueBell } from "@/components/RunnerQueueBell";
import { useCart } from "@/context/CartContext";
import { useRunnerEntry } from "@/lib/use-runner-entry";
import { formatMenuPriceLabel, type MenuItem } from "@/lib/types";

function priceLabel(item: MenuItem): string {
  return formatMenuPriceLabel(item);
}

export function ShopSearchBar({
  products,
  value,
  onChange,
  onSelect,
  placeholder = "Search your meal",
}: {
  products: MenuItem[];
  value: string;
  onChange: (v: string) => void;
  onSelect: (item: MenuItem) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((item) => item.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [products, value]);

  return (
    <div className="relative min-w-0 flex-1">
      <label className="flex h-10 w-full min-w-0 items-center gap-2 rounded-full border border-gray-200 bg-white pl-3 pr-3 shadow-sm sm:h-11">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 text-gray-400"
          fill="none"
          aria-hidden
        >
          <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
          <path
            d="m16 16 4 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          autoComplete="off"
          aria-label={placeholder}
        />
      </label>
      {focused && suggestions.length > 0 && (
        <ul
          className="shop-surface absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl py-1"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm"
                style={{ color: "#111111" }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(item);
                  setFocused(false);
                }}
              >
                <span className="truncate pr-3">{item.name}</span>
                <span
                  className="shrink-0 font-bold"
                  style={{ color: "#ED1C24" }}
                >
                  {priceLabel(item)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type ShopLayoutProps = {
  deliveryLabel: string;
  /** Optional restaurant brand mark next to the delivery label. */
  deliveryLogoSrc?: string;
  searchProducts?: MenuItem[];
  search?: string;
  onSearchChange?: (v: string) => void;
  onSearchSelect?: (item: MenuItem) => void;
  searchPlaceholder?: string;
  /** Replace the default product search bar (e.g. MealSearch on canteen index). */
  searchSlot?: ReactNode;
  sidebar: ReactNode;
  mobileSidebarTitle?: string;
  children: ReactNode;
  cartChannel?: "fusion" | "canteen";
  /** Hide floating Track Order on menu pages. */
  hideTrackFab?: boolean;
  /** When false, disable checkout CTAs (canteen closed). */
  orderingEnabled?: boolean;
};

/**
 * Shared Fusion/Canteen storefront chrome: header, category rail, cart column,
 * AppShell FABs (track / feedback / bottom nav).
 */
export function ShopLayout({
  deliveryLabel,
  deliveryLogoSrc,
  searchProducts = [],
  search = "",
  onSearchChange,
  onSearchSelect,
  searchPlaceholder,
  searchSlot,
  sidebar,
  mobileSidebarTitle = "Categories",
  children,
  cartChannel = "fusion",
  hideTrackFab = false,
  orderingEnabled = true,
}: ShopLayoutProps) {
  const runnerEntry = useRunnerEntry("cuhk");
  const { itemCount, addItem } = useCart();
  const [mobileCatsOpen, setMobileCatsOpen] = useState(false);

  return (
    <AppShell hideTrackFab={hideTrackFab}>
      <div className="shop-page min-h-screen bg-[#f5f5f5]">
        <header className="sticky top-0 z-50 overflow-visible border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-700 lg:hidden"
              aria-label={`Open ${mobileSidebarTitle.toLowerCase()}`}
              onClick={() => setMobileCatsOpen(true)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <GraceRunWordmark href="/cuhk" className="sm:hidden" />

            <Link
              href="/cuhk"
              className="hidden shrink-0 items-center gap-2 sm:flex"
              aria-label="CUHK home"
            >
              <AppLogo size={36} className="h-9 w-9" />
              <span className="text-sm font-extrabold tracking-tight text-gray-900">
                GraceRun
              </span>
            </Link>

            <div className="hidden min-w-0 max-w-[240px] flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm md:flex xl:max-w-[320px]">
              {deliveryLogoSrc ? (
                <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-gray-200">
                  <Image
                    src={deliveryLogoSrc}
                    alt=""
                    fill
                    sizes="28px"
                    className="object-contain p-0.5"
                  />
                </span>
              ) : (
                <span className="text-gray-400" aria-hidden>
                  📍
                </span>
              )}
              <span className="truncate text-gray-700">{deliveryLabel}</span>
            </div>

            <div className="relative min-w-[140px] flex-1 md:min-w-[400px] md:max-w-xl">
              {searchSlot ?? (
                <ShopSearchBar
                  products={searchProducts}
                  value={search}
                  onChange={onSearchChange ?? (() => undefined)}
                  onSelect={(item) => {
                    onSearchSelect?.(item);
                    addItem(item);
                  }}
                  placeholder={searchPlaceholder ?? "Search your meal"}
                />
              )}
            </div>

            <Link
              href={runnerEntry.href}
              aria-busy={runnerEntry.loading || undefined}
              aria-disabled={runnerEntry.loading || undefined}
              onClick={runnerEntry.onClick}
              className={`hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 lg:inline-flex ${
                runnerEntry.loading ? "opacity-60" : ""
              }`}
            >
              Runner
            </Link>

            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <CustomerNotificationBell className="h-11 w-11 rounded-full" />
              <RunnerQueueBell className="h-11 w-11 rounded-full border border-gray-200 bg-white text-gray-700" />
            </div>

            <Link
              href="/cart"
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-700 xl:hidden"
              aria-label="Cart"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <path
                  d="M3 5h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="10" cy="20" r="1.2" fill="currentColor" />
                <circle cx="17" cy="20" r="1.2" fill="currentColor" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ED1C24] px-1 text-[10px] font-bold text-white">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center">
              <AccountMenu hideThemeChip avatarSize={36} />
            </div>
          </div>
        </header>

        {mobileCatsOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label={`Close ${mobileSidebarTitle.toLowerCase()}`}
              onClick={() => setMobileCatsOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-[min(88vw,320px)] flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-3">
                <p className="text-sm font-bold text-gray-900">
                  {mobileSidebarTitle}
                </p>
                <div className="flex items-center gap-2">
                  <CustomerNotificationBell className="!h-11 !w-11" />
                  <RunnerQueueBell className="h-11 w-11 rounded-lg border border-gray-200 bg-white text-gray-700" />
                  <button
                    type="button"
                    onClick={() => setMobileCatsOpen(false)}
                    className="flex h-11 min-w-11 items-center justify-center rounded-lg px-2 text-sm font-semibold text-gray-500"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div
                className="flex-1 overflow-y-auto"
                onClick={() => setMobileCatsOpen(false)}
              >
                {sidebar}
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto grid max-w-[1400px] gap-0 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_300px]">
          <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] overflow-y-auto border-r border-gray-200 bg-white lg:block">
            <p className="sticky top-0 z-[1] border-b border-gray-100 bg-white px-3 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
              {mobileSidebarTitle}
            </p>
            {sidebar}
          </aside>

          <main className="min-w-0 px-3 py-4 pr-14 pb-[calc(16rem+env(safe-area-inset-bottom,0px))] sm:px-4 sm:pr-4 md:pb-28">
            {children}
          </main>

          <div className="sticky top-[57px] hidden h-[calc(100vh-57px)] p-3 xl:block">
            <MenuCartSummary
              channel={cartChannel}
              orderingEnabled={orderingEnabled}
            />
          </div>
        </div>

        <OrderActionBar orderingEnabled={orderingEnabled} />
      </div>
    </AppShell>
  );
}
