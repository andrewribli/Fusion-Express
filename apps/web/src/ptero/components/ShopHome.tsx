"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AccountMenu } from "@/ptero/components/AccountMenu";
import { AppLogo } from "@/ptero/components/AppLogo";
import { AppShell } from "@/ptero/components/AppShell";
import { CartSidebar } from "@/ptero/components/CartSidebar";
import { CustomItemCard } from "@/ptero/components/CustomItemCard";
import { CustomerNotificationBell } from "@/ptero/components/CustomerNotificationBell";
import { FeedbackButton } from "@/ptero/components/FeedbackButton";
import { MenuItemCard } from "@/ptero/components/MenuItemCard";
import { OrderActionBar } from "@/ptero/components/OrderActionBar";
import { PreviousOrderChecklist } from "@/ptero/components/PreviousOrderChecklist";
import { ProductRailCard } from "@/ptero/components/ProductRailCard";
import { PrototypeBanner } from "@/ptero/components/PrototypeBanner";
import { RunnerQueueBell } from "@/ptero/components/RunnerQueueBell";
import { CAMPUS } from "@/ptero/config/campus";
import { SIDEBAR_CATEGORIES, type SidebarCategoryId } from "@/ptero/config/categories";
import {
  CATEGORY_LABELS,
  productsByCategory,
  recommendedProducts,
  searchProducts,
  TASTE_PRODUCTS,
} from "@/ptero/config/products";
import { useCart } from "@/ptero/context/CartContext";
import { useUser } from "@/ptero/context/AppState";
import { runnerEntryHref } from "@/ptero/lib/nav";

export function ShopHome() {
  const { itemCount } = useCart();
  const { user, setMode, canRunnerMode } = useUser();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<SidebarCategoryId | "all">(
    "all",
  );
  const [mobileCatsOpen, setMobileCatsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const searching = Boolean(search.trim());
  const results = useMemo(
    () => (searching ? searchProducts(search) : []),
    [search, searching],
  );
  const recommended = useMemo(() => recommendedProducts(), []);
  const categoryItems = useMemo(() => {
    if (activeCategory === "all") return TASTE_PRODUCTS;
    return productsByCategory(activeCategory);
  }, [activeCategory]);

  const activeLabel =
    activeCategory === "all"
      ? "All items"
      : CATEGORY_LABELS[activeCategory];

  function selectCategory(id: SidebarCategoryId | "all") {
    setActiveCategory(id);
    setSearch("");
    setMobileCatsOpen(false);
  }

  const categoryList = (
    <nav aria-label="Categories" className="flex flex-col">
      <button
        type="button"
        onClick={() => selectCategory("all")}
        className={`flex w-full items-center justify-between border-b border-gray-100 px-3 py-3 text-left text-sm transition-colors ${
          activeCategory === "all"
            ? "bg-red-50 font-bold text-[#ED1C24]"
            : "font-medium text-gray-800 hover:bg-gray-50"
        }`}
      >
        <span>All items</span>
        <span className="text-gray-400" aria-hidden>
          ›
        </span>
      </button>
      {SIDEBAR_CATEGORIES.map((cat) => {
        const active = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => selectCategory(cat.id)}
            className={`flex w-full items-center justify-between border-b border-gray-100 px-3 py-3 text-left text-sm transition-colors ${
              active
                ? "bg-red-50 font-bold text-[#ED1C24]"
                : "font-medium text-gray-800 hover:bg-gray-50"
            }`}
          >
            <span className="pr-2 leading-snug">{cat.label}</span>
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

        {/* Foodpanda-style top header */}
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-3 py-2.5 sm:px-4">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 lg:hidden"
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
              className="flex shrink-0 items-center justify-center"
              aria-label={`${CAMPUS.brandName} home`}
            >
              <AppLogo size={48} className="h-12 w-12" />
            </Link>

            <Link
              href="/cityu/canteen"
              className="inline-flex shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] font-bold text-emerald-800 sm:px-3 sm:text-xs"
            >
              Canteens
            </Link>

            <button
              type="button"
              className="hidden min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm lg:flex"
              onClick={() => document.getElementById("delivery-hint")?.scrollIntoView()}
            >
              <span className="text-gray-400" aria-hidden>
                📍
              </span>
              <span className="truncate text-gray-700">
                Deliver to CityU hall lobby · Taste, Festival Walk
              </span>
            </button>

            <div className="relative min-w-0 flex-1 md:max-w-md">
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${CAMPUS.supermarket}`}
                className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 pr-10 text-sm outline-none focus:border-[#ED1C24]"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => searchRef.current?.focus()}
                className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-[#ED1C24] text-white"
                aria-label="Search"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                  <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
                  <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <Link
              href={runnerEntryHref({
                loggedIn: Boolean(user && !user.isGuest),
                canRunnerMode,
              })}
              onClick={() => {
                if (canRunnerMode) setMode("runner");
              }}
              className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 lg:inline-flex"
            >
              Runner
            </Link>

            <CustomerNotificationBell className="h-10 w-10 rounded-lg" />
            <RunnerQueueBell className="h-10 w-10 rounded-lg" />

            <Link
              href="/cityu/cart"
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

            <div className="hidden sm:block">
              <AccountMenu />
            </div>
          </div>
        </header>

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
          <main className="min-w-0 px-3 py-4 pb-28 sm:px-4">
            <p id="delivery-hint" className="text-sm font-medium text-gray-800">
              {CAMPUS.tagline}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Pickup at {CAMPUS.supermarket}, {CAMPUS.supermarketLocation}.
            </p>

            {searching ? (
              <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="text-base font-bold text-gray-900">
                  Results for “{search.trim()}”
                </h2>
                {results.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500">No matching Taste items.</p>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {results.map((item) => (
                      <MenuItemCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </section>
            ) : activeCategory !== "all" ? (
              <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="text-lg font-extrabold text-gray-900">{activeLabel}</h2>
                {categoryItems.length === 0 ? (
                  <p className="mt-6 text-sm text-gray-500">
                    No dummy Taste items in this aisle yet — try Instant Meal, Beverages, or
                    Snacks &amp; Crisps.
                  </p>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {categoryItems.map((item) => (
                      <MenuItemCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <>
                <section className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-r from-[#ED1C24] to-[#c9171e] p-5 text-white shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                    Ptero
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">
                    Apply a voucher at checkout!
                  </h2>
                  <p className="mt-1 max-w-xl text-sm text-white/90">
                    Prototype promo banner — order from Taste and we deliver to your CityU hall
                    lobby. Pay after delivery via Airwallex.
                  </p>
                </section>

                <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-extrabold text-gray-900">
                      Recommended for you
                    </h2>
                  </div>
                  <div className="scrollbar-hide -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                    {recommended.map((item) => (
                      <ProductRailCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>

                <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                  <h2 className="text-lg font-extrabold text-gray-900">More from Taste</h2>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {TASTE_PRODUCTS.slice(0, 12).map((item) => (
                      <MenuItemCard key={item.id} item={item} />
                    ))}
                  </div>
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
      <FeedbackButton />
    </AppShell>
  );
}
