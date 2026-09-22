"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";
import { AppLogo } from "@/components/AppLogo";
import { AppShell } from "@/components/AppShell";
import { MenuCartSummary } from "@/components/MenuCartSummary";
import { OrderActionBar } from "@/components/OrderActionBar";
import { RunnerQueueBell } from "@/components/RunnerQueueBell";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { runnerEntryHref } from "@/lib/nav";
import { formatMenuPrice, type MenuItem } from "@/lib/types";

function priceLabel(item: MenuItem): string {
  const raw = formatMenuPrice(item);
  return raw.startsWith("HK") ? raw : `HK${raw}`;
}

export function ShopSearchBar({
  products,
  value,
  onChange,
  onSelect,
  placeholder = "Search products",
}: {
  products: MenuItem[];
  value: string;
  onChange: (v: string) => void;
  onSelect: (item: MenuItem) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((item) => item.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [products, value]);

  return (
    <div className="relative min-w-0 flex-1">
      <div
        className="flex h-11 w-full min-w-0 items-center gap-1 rounded-full pl-3 pr-1.5"
        style={{
          backgroundColor: "#ffffff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        }}
      >
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm outline-none"
          style={{ backgroundColor: "transparent", color: "#111111" }}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ color: "#555555" }}
          aria-label="Scan or upload a product photo"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <path
              d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.2-1.8A1 1 0 0 1 10 4h4a1 1 0 0 1 .8.4L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <circle
              cx="12"
              cy="12.5"
              r="3.2"
              stroke="currentColor"
              strokeWidth="1.8"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "#ff6a00" }}
          aria-label="Search"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-white"
            fill="none"
            aria-hidden
          >
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2.2" />
            <path
              d="m16 16 4 4"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={() => {
          onChange("");
          inputRef.current?.focus();
        }}
      />
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
  searchProducts: MenuItem[];
  search: string;
  onSearchChange: (v: string) => void;
  onSearchSelect: (item: MenuItem) => void;
  searchPlaceholder?: string;
  sidebar: ReactNode;
  mobileSidebarTitle?: string;
  children: ReactNode;
  cartChannel?: "fusion" | "canteen";
};

/**
 * Shared Fusion/Canteen storefront chrome: header, category rail, cart column,
 * AppShell FABs (track / feedback / bottom nav).
 */
export function ShopLayout({
  deliveryLabel,
  searchProducts,
  search,
  onSearchChange,
  onSearchSelect,
  searchPlaceholder,
  sidebar,
  mobileSidebarTitle = "Categories",
  children,
  cartChannel = "fusion",
}: ShopLayoutProps) {
  const { user, setMode, canRunnerMode } = useUser();
  const { itemCount, addItem } = useCart();
  const [mobileCatsOpen, setMobileCatsOpen] = useState(false);

  return (
    <AppShell>
      <div className="shop-page min-h-screen bg-[#f5f5f5]">
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-3 py-2.5 sm:px-4">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 lg:hidden"
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

            <Link
              href="/"
              className="flex shrink-0 items-center gap-2"
              aria-label="GraceRun home"
            >
              <AppLogo size={36} className="h-9 w-9" />
              <span className="hidden text-sm font-extrabold tracking-tight text-gray-900 sm:block">
                GraceRun
              </span>
            </Link>

            <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm md:flex">
              <span className="text-gray-400" aria-hidden>
                📍
              </span>
              <span className="truncate text-gray-700">{deliveryLabel}</span>
            </div>

            <div className="relative min-w-0 flex-1 md:max-w-md">
              <ShopSearchBar
                products={searchProducts}
                value={search}
                onChange={onSearchChange}
                onSelect={(item) => {
                  onSearchSelect(item);
                  addItem(item);
                }}
                placeholder={searchPlaceholder}
              />
            </div>

            <Link
              href={runnerEntryHref({
                loggedIn: Boolean(user),
                canRunnerMode,
              })}
              onClick={() => {
                if (canRunnerMode) setMode("runner");
              }}
              className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 lg:inline-flex"
            >
              Runner
            </Link>

            <RunnerQueueBell />

            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 xl:hidden"
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

            <div className="hidden shrink-0 sm:block">
              <AccountMenu hideThemeChip />
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
              <div className="flex items-center justify-between border-b border-gray-100 px-3 py-3">
                <p className="text-sm font-bold text-gray-900">
                  {mobileSidebarTitle}
                </p>
                <button
                  type="button"
                  onClick={() => setMobileCatsOpen(false)}
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-gray-500"
                >
                  Close
                </button>
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

          <main className="min-w-0 px-3 py-4 pb-36 sm:px-4">{children}</main>

          <div className="sticky top-[57px] hidden h-[calc(100vh-57px)] p-3 xl:block">
            <MenuCartSummary channel={cartChannel} />
          </div>
        </div>

        <OrderActionBar />
      </div>
    </AppShell>
  );
}
