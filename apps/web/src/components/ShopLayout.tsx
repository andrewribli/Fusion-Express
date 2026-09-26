"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";
import { AppShell } from "@/components/AppShell";
import { MenuCartSummary } from "@/components/MenuCartSummary";
import { MobileAppHeader } from "@/components/MobileAppHeader";
import { OrderActionBar } from "@/components/OrderActionBar";
import { RunnerQueueBell } from "@/components/RunnerQueueBell";
import { useCart } from "@/context/CartContext";
import { useCampus } from "@/context/CampusContext";
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
  inputRef,
  autoFocus,
}: {
  products: MenuItem[];
  value: string;
  onChange: (v: string) => void;
  onSelect: (item: MenuItem) => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;
  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((item) => item.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [products, value]);

  return (
    <div className="relative min-w-0 flex-1">
      <input
        ref={ref}
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#ED1C24]"
        style={{ color: "#111111" }}
        autoComplete="off"
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
                <span className="shrink-0 font-bold" style={{ color: "#ED1C24" }}>
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
  deliveryLogoSrc?: string;
  searchProducts: MenuItem[];
  search: string;
  onSearchChange: (v: string) => void;
  onSearchSelect: (item: MenuItem) => void;
  searchPlaceholder?: string;
  sidebar: ReactNode;
  mobileSidebarTitle?: string;
  children: ReactNode;
  cartChannel?: "fusion" | "canteen";
  hideTrackFab?: boolean;
  orderingEnabled?: boolean;
};

/**
 * Shared Fusion/Canteen storefront chrome: unified mobile header, category rail,
 * cart column, AppShell FABs (docked track / feedback / bottom nav).
 */
export function ShopLayout({
  deliveryLabel,
  deliveryLogoSrc,
  searchProducts,
  search,
  onSearchChange,
  onSearchSelect,
  searchPlaceholder,
  sidebar,
  mobileSidebarTitle = "Categories",
  children,
  cartChannel = "fusion",
  hideTrackFab = false,
  orderingEnabled = true,
}: ShopLayoutProps) {
  const { user, setMode, canRunnerMode } = useUser();
  const { config } = useCampus();
  const { itemCount, addItem } = useCart();
  const [searchOpen, setSearchOpen] = useState(Boolean(search.trim()));
  const searchRef = useRef<HTMLInputElement>(null);

  const cartHref = cartChannel === "canteen" ? "/canteen/cart" : "/cart";
  const canteenHref = "/canteen";
  const otherCampusHref = "/cityu";

  const menuLinks = [
    { href: canteenHref, label: "Canteens" },
    { href: "/fusion", label: "Fusion groceries" },
    { href: otherCampusHref, label: "Switch to CityU" },
    {
      href: runnerEntryHref({
        loggedIn: Boolean(user),
        canRunnerMode,
      }),
      label: canRunnerMode ? "Runner dashboard" : "Become a runner",
      onClick: () => {
        if (canRunnerMode) setMode("runner");
      },
    },
    { href: user ? "/profile" : "/login", label: user ? "Account" : "Sign in" },
    { href: "/#feedback", label: "Feedback" },
  ];

  return (
    <AppShell hideTrackFab={hideTrackFab}>
      <div className="shop-page min-h-screen bg-[#f5f5f5]">
        <MobileAppHeader
          logo={<AppLogo size={32} className="h-8 w-8" />}
          brandName={config.brandLabel}
          homeHref="/"
          cartHref={cartHref}
          cartCount={itemCount}
          bell={<RunnerQueueBell className="h-11 w-11 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50" />}
          onSearchClick={() => {
            setSearchOpen((v) => {
              const next = !v;
              if (next) {
                window.setTimeout(() => searchRef.current?.focus(), 50);
              }
              return next;
            });
          }}
          searchOpen={searchOpen}
          searchSlot={
            <ShopSearchBar
              products={searchProducts}
              value={search}
              onChange={onSearchChange}
              inputRef={searchRef}
              autoFocus
              onSelect={(item) => {
                onSearchSelect(item);
                addItem(item);
              }}
              placeholder={searchPlaceholder}
            />
          }
          menuTitle={mobileSidebarTitle}
          menuLinks={menuLinks}
          menuBody={sidebar}
        />

        <div className="mx-auto hidden max-w-[1400px] items-center gap-2 px-4 py-2 text-sm text-gray-600 md:flex">
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
            <span aria-hidden>📍</span>
          )}
          <span className="truncate">{deliveryLabel}</span>
          <Link
            href={runnerEntryHref({
              loggedIn: Boolean(user),
              canRunnerMode,
            })}
            onClick={() => {
              if (canRunnerMode) setMode("runner");
            }}
            className="ml-auto rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"
          >
            Runner
          </Link>
        </div>

        <div className="mx-auto grid max-w-[1400px] gap-0 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_300px]">
          <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] overflow-y-auto border-r border-gray-200 bg-white lg:block">
            <p className="sticky top-0 z-[1] border-b border-gray-100 bg-white px-3 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
              {mobileSidebarTitle}
            </p>
            {sidebar}
          </aside>

          <main className="min-w-0 px-3 py-4 pb-36 sm:px-4">{children}</main>

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
