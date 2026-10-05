"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AccountMenu } from "@/ptero/components/AccountMenu";
import { AppLogo } from "@/ptero/components/AppLogo";
import { AppShell } from "@/ptero/components/AppShell";
import { CartSidebar } from "@/ptero/components/CartSidebar";
import { CustomItemCard } from "@/ptero/components/CustomItemCard";
import { CustomerNotificationBell } from "@/ptero/components/CustomerNotificationBell";
import { FeedbackButton } from "@/ptero/components/FeedbackButton";
import { GrocerySourcePicker } from "@/ptero/components/GrocerySourcePicker";
import { MenuItemCard } from "@/ptero/components/MenuItemCard";
import { CartDropdown } from "@/ptero/components/CartDropdown";
import { TrackOrderHeaderButton } from "@/ptero/components/TrackOrderHeaderButton";
import { PreviousOrderChecklist } from "@/ptero/components/PreviousOrderChecklist";
import { PrototypeBanner } from "@/ptero/components/PrototypeBanner";
import { CAMPUS } from "@/ptero/config/campus";
import { TASTE_PRODUCTS } from "@/ptero/config/products";
import { useUser } from "@/ptero/context/AppState";
import { useIsAdmin } from "@/lib/use-is-admin";
import { ADMIN_ORDERING_NOTE } from "@/lib/order-window";
import { useRunnerEntry } from "@/lib/use-runner-entry";
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
  const { user, setMode } = useUser();
  const runnerEntry = useRunnerEntry("cityu");
  const isAdmin = useIsAdmin(user?.uid);
  const [search, setSearch] = useState("");
  const [mobileCatsOpen, setMobileCatsOpen] = useState(false);
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
  const canOrderStore = storeOpen || isAdmin;
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
    setMobileCatsOpen(false);
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
    <AppShell hideTrackFab>
      <div className="shop-page min-h-screen bg-[#F0F7F2]">
        <PrototypeBanner />

        {/* Foodpanda-style top header */}
        <header className="sticky top-0 z-50 overflow-visible border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-700 lg:hidden"
              aria-label="Open categories"
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

            <Link
              href="/cityu/canteen"
              className="hidden shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 lg:inline-flex"
            >
              Canteens
            </Link>

            <button
              type="button"
              className="hidden min-w-0 max-w-[240px] flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm md:flex xl:max-w-[320px]"
              onClick={() => document.getElementById("delivery-hint")?.scrollIntoView()}
            >
              <span className="text-gray-400" aria-hidden>
                📍
              </span>
              <span className="truncate text-gray-700">
                Deliver to CityU hall lobby
                {store ? ` · ${store.name}` : ""}
              </span>
            </button>

            <div className="relative min-w-[140px] flex-1 md:min-w-[400px] md:max-w-xl">
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
                  ref={searchRef}
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setVisibleCount(48);
                  }}
                  placeholder={store ? `Search ${store.name}` : "Search groceries"}
                  className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  autoComplete="off"
                  aria-label={store ? `Search ${store.name}` : "Search groceries"}
                />
              </label>
            </div>

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
              className={`hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 lg:inline-flex ${
                runnerEntry.loading ? "opacity-60" : ""
              }`}
            >
              Runner
            </Link>

            <div className="hidden sm:block">
              <CustomerNotificationBell className="!h-11 !w-11" />
            </div>

            <TrackOrderHeaderButton />
            <CartDropdown className="xl:hidden" browseHref="/cityu" />

            <AccountMenu />
          </div>
        </header>
        <GrocerySourcePicker selected={source} onSelect={chooseSource} />

        {/* Mobile category drawer */}
        {mobileCatsOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close categories"
              onClick={() => setMobileCatsOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-[min(88vw,320px)] flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-3 py-3">
                <p className="text-sm font-bold text-gray-900">Categories</p>
                <button
                  type="button"
                  onClick={() => setMobileCatsOpen(false)}
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-gray-500"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{categoryList}</div>
            </div>
          </div>
        )}

        <div className="mx-auto grid max-w-[1400px] gap-0 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_300px]">
          {/* Left vertical categories */}
          <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] overflow-y-auto border-r border-gray-200 bg-white lg:block">
            <p className="sticky top-0 z-[1] border-b border-gray-100 bg-white px-3 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
              Categories
            </p>
            {categoryList}
          </aside>

          {/* Center content */}
          <main className="min-w-0 px-3 py-4 pb-[calc(16rem+env(safe-area-inset-bottom,0px))] sm:px-4 md:pb-28">
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
                  {store.deliveryFee} base before hall surcharge.
                </p>
                {!storeOpen ? (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                    {store.name} is closed ({store.hours.open}–{store.hours.close}). The menu
                    stays visible. Deliver now waits until it opens. You can schedule a
                    time during opening hours.
                    {isAdmin ? (
                      <span className="mt-1 block font-medium text-gray-800">
                        {ADMIN_ORDERING_NOTE}
                      </span>
                    ) : null}
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
                            item={{ ...item, inStock: canOrderStore && item.inStock }}
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
      <FeedbackButton />
    </AppShell>
  );
}
