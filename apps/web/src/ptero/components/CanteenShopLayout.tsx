"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { AppLogo } from "@/ptero/components/AppLogo";
import { CartSidebar } from "@/ptero/components/CartSidebar";
import { MobileAppHeader } from "@/components/MobileAppHeader";
import { OrderActionBar } from "@/ptero/components/OrderActionBar";
import { PreviousOrderChecklist } from "@/ptero/components/PreviousOrderChecklist";
import { RunnerQueueBell } from "@/ptero/components/RunnerQueueBell";
import { TrackOrderFab } from "@/ptero/components/TrackOrderFab";
import { CAMPUS } from "@/ptero/config/campus";
import { useCart } from "@/ptero/context/CartContext";
import { useUser } from "@/ptero/context/AppState";
import { isOverOrderLimit } from "@/ptero/lib/constants";
import { runnerEntryHref } from "@/ptero/lib/nav";

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
 * Canteen shop chrome — unified mobile header shared with CUHK.
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
  const [searchOpen, setSearchOpen] = useState(Boolean(search.trim()));
  const searchRef = useRef<HTMLInputElement>(null);

  const checkoutHref = useMemo(() => {
    if (overLimit) return "/cityu/canteen";
    return itemCount > 0 ? "/cityu/checkout" : "/cityu/cart";
  }, [overLimit, itemCount]);

  return (
    <div className="min-h-screen bg-[#f7f7f7] pb-28">
      <MobileAppHeader
        logo={<AppLogo size={32} className="h-8 w-8" />}
        brandName={CAMPUS.brandName}
        homeHref="/cityu"
        cartHref={checkoutHref}
        cartCount={itemCount}
        bell={
          <RunnerQueueBell className="h-11 w-11 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50" />
        }
        onSearchClick={() => {
          setSearchOpen((v) => {
            const next = !v;
            if (next) window.setTimeout(() => searchRef.current?.focus(), 50);
            return next;
          });
        }}
        searchOpen={searchOpen}
        searchSlot={
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#ED1C24]"
          />
        }
        menuTitle={mobileSidebarTitle}
        menuLinks={[
          { href: "/cityu/canteen", label: "Canteens" },
          { href: "/cityu/taste", label: "Taste groceries" },
          { href: "/cuhk", label: "Switch to CUHK" },
          {
            href: runnerEntryHref({
              loggedIn: Boolean(user && !user.isGuest),
              canRunnerMode,
            }),
            label: canRunnerMode ? "Runner dashboard" : "Become a runner",
            onClick: () => {
              if (canRunnerMode) setMode("runner");
            },
          },
          {
            href: user && !user.isGuest ? "/cityu/profile" : "/cityu/login",
            label: user && !user.isGuest ? "Account" : "Sign in",
          },
        ]}
        menuBody={sidebar}
      />

      <p className="mx-auto hidden max-w-7xl px-4 pt-3 text-xs font-semibold text-emerald-800 md:block">
        {deliveryLabel}
      </p>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white shadow-sm">
            <p className="border-b border-gray-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {mobileSidebarTitle}
            </p>
            {sidebar}
          </div>
        </aside>

        <div className="min-w-0">{children}</div>

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
    </div>
  );
}
