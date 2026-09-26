"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AppLogo } from "@/ptero/components/AppLogo";
import { AppShell } from "@/ptero/components/AppShell";
import { CartSidebar } from "@/ptero/components/CartSidebar";
import { CustomItemCard } from "@/ptero/components/CustomItemCard";
import { GrocerySourcePicker } from "@/ptero/components/GrocerySourcePicker";
import { MenuItemCard } from "@/ptero/components/MenuItemCard";
import { OrderActionBar } from "@/ptero/components/OrderActionBar";
import { PreviousOrderChecklist } from "@/ptero/components/PreviousOrderChecklist";
import { PrototypeBanner } from "@/ptero/components/PrototypeBanner";
import { RunnerQueueBell } from "@/ptero/components/RunnerQueueBell";
import { MobileAppHeader } from "@/components/MobileAppHeader";
import { CAMPUS } from "@/ptero/config/campus";
import { TASTE_PRODUCTS } from "@/ptero/config/products";
import { useCart } from "@/ptero/context/CartContext";
import { useUser } from "@/ptero/context/AppState";
import { runnerEntryHref } from "@/ptero/lib/nav";
import type { MenuItem } from "@/ptero/lib/types";
import { loadWellcomeMenu } from "@/lib/loadWellcomeMenu";
import {
  CANONICAL_GROCERY_CATEGORIES,
  GROCERY_SOURCE_STORAGE_KEY,
  canonicalGroceryCategory,
  grocerySourceById,
  isGroceryOpen,
  isGrocerySourceId,
  type CanonicalGroceryCategory,
  type GrocerySourceId,
} from "@/lib/grocerySources";

export function ShopHome({ routeSource }: { routeSource?: GrocerySourceId }) {
  const { itemCount } = useCart();
  const { user, setMode, canRunnerMode } = useUser();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [source, setSource] = useState<GrocerySourceId | null>(null);
  const [aisle, setAisle] = useState<CanonicalGroceryCategory | "all">("all");
  const [sortDesc, setSortDesc] = useState(false);
  const [visibleCount, setVisibleCount] = useState(48);
  const [wellcomeItems, setWellcomeItems] = useState<MenuItem[]>([]);
  const [wellcomeStatus, setWellcomeStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (routeSource) {
      setSource(routeSource);
      return;
    }
    const stored = window.localStorage.getItem(GROCERY_SOURCE_STORAGE_KEY);
    if (isGrocerySourceId(stored)) setSource(stored);
  }, [routeSource]);

  useEffect(() => {
    if (source !== "wellcome") return;
    let cancelled = false;
    setWellcomeStatus("loading");
    loadWellcomeMenu()
      .then((rows) => {
        if (cancelled) return;
        setWellcomeItems(rows);
        setWellcomeStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setWellcomeStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  function chooseSource(id: GrocerySourceId) {
    setSource(id);
    window.localStorage.setItem(GROCERY_SOURCE_STORAGE_KEY, id);
    setAisle("all");
    setSearch("");
    setVisibleCount(48);
  }

  const store = source ? grocerySourceById(source) : null;
  const storeOpen = source ? isGroceryOpen(source) : false;
  const catalog = source === "wellcome" ? wellcomeItems : source === "taste" ? TASTE_PRODUCTS : [];

  const searching = Boolean(search.trim());
  const menuItems = useMemo(() => {
    if (!source) return [];
    const q = search.trim().toLowerCase();
    let rows = catalog;
    if (q) {
      rows = rows.filter((item) => item.name.toLowerCase().includes(q));
    } else if (aisle !== "all") {
      rows = rows.filter(
        (item) => canonicalGroceryCategory(item.category, item.name) === aisle,
      );
    }
    const sorted = [...rows].sort(
      (a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price),
    );
    return sortDesc ? sorted.reverse() : sorted;
  }, [aisle, catalog, search, sortDesc, source]);

  function selectAisle(id: CanonicalGroceryCategory | "all") {
    setAisle(id);
    setSearch("");
    setVisibleCount(48);
  }

  const categoryList = (
    <nav aria-label="Categories" className="flex flex-col">
      <button
        type="button"
        onClick={() => selectAisle("all")}
        className={`flex w-full items-center justify-between border-b border-gray-100 px-3 py-3 text-left text-sm transition-colors ${
          aisle === "all"
            ? "bg-red-50 font-bold text-[#ED1C24]"
            : "font-medium text-gray-800 hover:bg-gray-50"
        }`}
      >
        <span>All items</span>
        <span className="text-gray-400" aria-hidden>
          ›
        </span>
      </button>
      {CANONICAL_GROCERY_CATEGORIES.map((cat) => {
        const active = aisle === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => selectAisle(cat)}
            className={`flex w-full items-center justify-between border-b border-gray-100 px-3 py-3 text-left text-sm transition-colors ${
              active
                ? "bg-red-50 font-bold text-[#ED1C24]"
                : "font-medium text-gray-800 hover:bg-gray-50"
            }`}
          >
            <span className="pr-2 leading-snug">{cat}</span>
            <span className="shrink-0 text-gray-400" aria-hidden>
              ›
            </span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <AppShell>
      <div className="shop-page min-h-screen bg-[#f5f5f5]">
        <PrototypeBanner />

        <MobileAppHeader
          logo={<AppLogo size={32} className="h-8 w-8" />}
          brandName={CAMPUS.brandName}
          homeHref="/cityu"
          cartHref="/cityu/cart"
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
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount(48);
              }}
              placeholder={store ? `Search ${store.name}` : "Search groceries"}
              className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#ED1C24]"
              autoComplete="off"
            />
          }
          menuTitle="Menu"
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
          menuBody={categoryList}
        />
        <GrocerySourcePicker selected={source} onSelect={chooseSource} />

        <div className="mx-auto grid max-w-[1400px] gap-0 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_300px]">
          {/* Left vertical categories */}
          <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] overflow-y-auto border-r border-gray-200 bg-white lg:block">
            <p className="sticky top-0 z-[1] border-b border-gray-100 bg-white px-3 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
              Categories
            </p>
            {categoryList}
          </aside>

          {/* Center content */}
          <main className="min-w-0 px-3 py-4 pb-28 sm:px-4">
            {!store ? (
              <p className="text-sm text-gray-600">
                Pick Taste or Wellcome. Your last choice is remembered next time.
              </p>
            ) : (
              <>
                <p id="delivery-hint" className="text-sm font-medium text-gray-800">
                  {store.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Pickup at {store.pickup}. {store.walkMinutes} min walk. Delivery HK$
                  {store.deliveryFee}.
                </p>
                {!storeOpen ? (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                    {store.name} is closed ({store.hours.open}–{store.hours.close}). The menu
                    stays visible and checkout is locked until it opens.
                  </p>
                ) : null}
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                  <button
                    type="button"
                    onClick={() => selectAisle("all")}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      aisle === "all" ? "bg-gray-900 text-white" : "bg-white text-gray-700"
                    }`}
                  >
                    All
                  </button>
                  {CANONICAL_GROCERY_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => selectAisle(cat)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        aisle === cat ? "bg-gray-900 text-white" : "bg-white text-gray-700"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSortDesc(false)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      !sortDesc ? "bg-[#ED1C24] text-white" : "bg-white text-gray-700"
                    }`}
                  >
                    Cheapest
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortDesc(true)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      sortDesc ? "bg-[#ED1C24] text-white" : "bg-white text-gray-700"
                    }`}
                  >
                    Most expensive
                  </button>
                </div>
                {source === "wellcome" && wellcomeStatus === "loading" ? (
                  <p className="mt-4 text-sm text-gray-500">Loading Wellcome…</p>
                ) : null}
                {source === "wellcome" && wellcomeStatus === "error" ? (
                  <p className="mt-4 text-sm text-red-600">Could not load Wellcome right now.</p>
                ) : null}
                <section className="mt-4">
                  {searching ? (
                    <h2 className="mb-3 text-base font-bold text-gray-900">
                      Results for “{search.trim()}”
                    </h2>
                  ) : null}
                  {menuItems.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      {source === "wellcome" && wellcomeStatus !== "ready"
                        ? "The Wellcome menu will show here once it has loaded."
                        : "Nothing in this aisle."}
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {menuItems.slice(0, visibleCount).map((item) => (
                          <MenuItemCard
                            key={item.id}
                            item={{ ...item, inStock: storeOpen && item.inStock }}
                          />
                        ))}
                      </div>
                      {visibleCount < menuItems.length ? (
                        <button
                          type="button"
                          onClick={() => setVisibleCount((count) => count + 48)}
                          className="mt-4 w-full rounded-xl bg-white py-3 text-sm font-semibold text-gray-800"
                        >
                          Show more ({menuItems.length - visibleCount} left)
                        </button>
                      ) : null}
                    </>
                  )}
                </section>
              </>
            )}
          </main>

          {/* Right cart sidebar */}
          <div className="sticky top-[57px] hidden h-[calc(100vh-57px)] space-y-3 overflow-y-auto p-3 xl:block">
            <div className="h-[min(48vh,380px)]">
              <CartSidebar />
            </div>
            <CustomItemCard />
            <PreviousOrderChecklist channel="taste" />
          </div>
        </div>
      </div>
      <OrderActionBar />
    </AppShell>
  );
}
