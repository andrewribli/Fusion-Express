"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";
import { AppShell } from "@/components/AppShell";
import { CustomItemCard } from "@/components/CustomItemCard";
import { MenuCartSummary } from "@/components/MenuCartSummary";
import { MenuItemCard } from "@/components/MenuItemCard";
import { OrderActionBar } from "@/components/OrderActionBar";
import { ProductCardQtyControl } from "@/components/ProductCardQtyControl";
import { ProductQuickAddModal } from "@/components/ProductQuickAddModal";
import { RunnerQueueBell } from "@/components/RunnerQueueBell";
import { DRY_AISLES, REFRIGERATED_AISLES } from "@/data/aisles";
import { getItemImage } from "@/data/aisle-images";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { loadAllProducts } from "@/lib/firestore";
import { resolveHomePopularItems } from "@/lib/home-popular";
import { runnerEntryHref } from "@/lib/nav";
import { useManualItemModal } from "@/lib/manual-item-modal";
import { getAisleItems, searchItems } from "@/lib/menu";
import { popularityScore, topPopularItems } from "@/lib/popular-items";
import { formatMenuPrice, type MenuItem } from "@/lib/types";
import { AppLogo } from "@/components/AppLogo";
import type { Aisle, StoreSection } from "@/data/aisles";

const BATCH = 24;
const BADGES = ["Highly rated", "In demand", "Lowest price"] as const;

function pickBadge(item: MenuItem, index: number): string {
  if (item.salePrice != null && item.salePrice < item.price) return "Lowest price";
  if (popularityScore(item) > 9000) return "In demand";
  return BADGES[index % BADGES.length];
}

function priceLabel(item: MenuItem): string {
  const raw = formatMenuPrice(item);
  return raw.startsWith("HK") ? raw : `HK${raw}`;
}

function TopPickCard({ item, index }: { item: MenuItem; index: number }) {
  const [open, setOpen] = useState(false);
  const badge = pickBadge(item, index);
  const image = getItemImage(item);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="shop-surface flex w-[148px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl text-left sm:w-[156px]"
        style={{
          backgroundColor: "#ffffff",
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        }}
      >
        <div
          className="relative aspect-square w-full"
          style={{ backgroundColor: "#fafafa" }}
        >
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              className="object-contain p-3"
              sizes="160px"
            />
          ) : null}
          <span
            className="absolute left-2 top-2 z-[1] rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: "#ED1C24" }}
          >
            {badge}
          </span>
          <ProductCardQtyControl item={item} size="sm" />
        </div>
        <div className="flex flex-col gap-1.5 px-3 pb-3 pt-2">
          <p
            className="line-clamp-2 min-h-[2.5rem] text-[12px] font-semibold leading-snug"
            style={{ color: "#111111" }}
          >
            {item.name}
          </p>
          <p className="text-lg font-extrabold leading-none" style={{ color: "#ED1C24" }}>
            {priceLabel(item)}
          </p>
        </div>
      </div>
      <ProductQuickAddModal item={item} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function HomeSearchBar({
  products,
  value,
  onChange,
  onSelect,
  inputRef,
}: {
  products: MenuItem[];
  value: string;
  onChange: (v: string) => void;
  onSelect: (item: MenuItem) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [focused, setFocused] = useState(false);
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
        style={{ backgroundColor: "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}
      >
        <input
          ref={inputRef}
          id="home-search"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder="Search products"
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
            <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "#ff6a00" }}
          aria-label="Search"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2.2" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
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

export function ShopHome() {
  const { addItem, itemCount } = useCart();
  const { user, setMode, canRunnerMode } = useUser();
  const { openManualItem } = useManualItemModal();
  const [guestBrowse, setGuestBrowse] = useState(false);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [feedCount, setFeedCount] = useState(BATCH);
  const [mobileCatsOpen, setMobileCatsOpen] = useState(false);
  const [activeAisle, setActiveAisle] = useState<{
    section: StoreSection;
    aisle: Aisle;
  } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const popularItems = useMemo(
    () => resolveHomePopularItems(products),
    [products],
  );

  const feedPool = useMemo(() => {
    const popularIds = new Set(popularItems.map((item) => item.id));
    const rest = products.filter((item) => !popularIds.has(item.id));
    return topPopularItems(rest.length > 0 ? rest : products, 200);
  }, [products, popularItems]);

  const feedVisible = feedPool.slice(0, feedCount);
  const searching = Boolean(search.trim());
  const searchResults = useMemo(
    () => (searching ? searchItems(products, search).slice(0, 48) : []),
    [products, search, searching],
  );

  const aisleItems = useMemo(() => {
    if (!activeAisle) return [];
    return getAisleItems(products, activeAisle.section, activeAisle.aisle.id);
  }, [products, activeAisle]);

  useEffect(() => {
    document.title = "Shop Now — GraceRun";
  }, []);

  useEffect(() => {
    if (user) {
      setGuestBrowse(false);
      return;
    }
    const q = new URLSearchParams(window.location.search);
    setGuestBrowse(q.get("guest") === "1" || q.get("guest") === "true");
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const items = await loadAllProducts();
        if (!cancelled) setProducts(items);
      } catch (err) {
        console.error("[shop] products query failed", err);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#search") searchRef.current?.focus();
    if (
      window.location.hash === "#manual-item" ||
      window.location.hash === "#add"
    ) {
      openManualItem();
    }
  }, [productsLoading, openManualItem]);

  const loadMore = useCallback(() => {
    setFeedCount((n) => Math.min(n + BATCH, feedPool.length));
  }, [feedPool.length]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || searching) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, searching, feedVisible.length]);

  function selectAisle(entry: { section: StoreSection; aisle: Aisle } | null) {
    setActiveAisle(entry);
    setSearch("");
    setMobileCatsOpen(false);
  }

  const categoryList = (
    <nav aria-label="Categories" className="flex flex-col">
      <button
        type="button"
        onClick={() => selectAisle(null)}
        className={`flex w-full items-center justify-between border-b border-gray-100 px-3 py-3 text-left text-sm ${
          !activeAisle
            ? "bg-red-50 font-bold text-[#ED1C24]"
            : "font-medium text-gray-800 hover:bg-gray-50"
        }`}
      >
        <span>All items</span>
        <span className="text-gray-400" aria-hidden>
          ›
        </span>
      </button>
      <p className="bg-gray-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">
        Fresh Food
      </p>
      {REFRIGERATED_AISLES.map((aisle) => {
        const active =
          activeAisle?.section === "refrigerated" &&
          activeAisle.aisle.id === aisle.id;
        return (
          <button
            key={`cold-${aisle.id}`}
            type="button"
            onClick={() => selectAisle({ section: "refrigerated", aisle })}
            className={`flex w-full items-center justify-between border-b border-gray-100 px-3 py-3 text-left text-sm ${
              active
                ? "bg-red-50 font-bold text-[#ED1C24]"
                : "font-medium text-gray-800 hover:bg-gray-50"
            }`}
          >
            <span className="pr-2 leading-snug">{aisle.label}</span>
            <span className="shrink-0 text-gray-400" aria-hidden>
              ›
            </span>
          </button>
        );
      })}
      <p className="bg-gray-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">
        Groceries
      </p>
      {DRY_AISLES.map((aisle) => {
        const active =
          activeAisle?.section === "dry" && activeAisle.aisle.id === aisle.id;
        return (
          <button
            key={`dry-${aisle.id}`}
            type="button"
            onClick={() => selectAisle({ section: "dry", aisle })}
            className={`flex w-full items-center justify-between border-b border-gray-100 px-3 py-3 text-left text-sm ${
              active
                ? "bg-red-50 font-bold text-[#ED1C24]"
                : "font-medium text-gray-800 hover:bg-gray-50"
            }`}
          >
            <span className="pr-2 leading-snug">{aisle.label}</span>
            <span className="shrink-0 text-gray-400" aria-hidden>
              ›
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => {
          setMobileCatsOpen(false);
          openManualItem();
        }}
        className="flex w-full items-center justify-between border-b border-gray-100 px-3 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50"
      >
        <span>Custom item</span>
        <span className="text-gray-400" aria-hidden>
          ›
        </span>
      </button>
    </nav>
  );

  return (
    <AppShell>
      <div className="shop-page min-h-screen bg-[#f5f5f5]">
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
              href="/"
              onClick={() => {
                setSearch("");
                selectAisle(null);
              }}
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
              <span className="truncate text-gray-700">
                Deliver to CUHK hall lobby · Fusion supermarket
              </span>
            </div>

            <div className="relative min-w-0 flex-1 md:max-w-md">
              <HomeSearchBar
                products={products}
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  if (v.trim()) setActiveAisle(null);
                }}
                inputRef={searchRef}
                onSelect={(item) => {
                  addItem(item);
                  setSearch("");
                }}
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
          <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] overflow-y-auto border-r border-gray-200 bg-white lg:block">
            <p className="sticky top-0 z-[1] border-b border-gray-100 bg-white px-3 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
              Categories
            </p>
            {categoryList}
          </aside>

          <main className="min-w-0 px-3 py-4 pb-36 sm:px-4">
            {guestBrowse && (
              <div className="mb-3 rounded-xl border border-[#ED1C24]/30 bg-red-50 px-4 py-3 text-sm text-gray-800">
                <p className="font-semibold text-gray-900">Ordering as guest</p>
                <p className="mt-0.5 text-xs text-gray-600">
                  Add items, then checkout with your dorm and lobby — no account
                  required.
                </p>
              </div>
            )}

            {searching ? (
              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="text-base font-bold text-gray-900">
                  Results for “{search.trim()}”
                </h2>
                {searchResults.length === 0 ? (
                  <p className="mt-4 text-center text-sm text-gray-500">
                    No matches. Try another name or add a custom item.
                  </p>
                ) : (
                  <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {searchResults.map((item) => (
                      <li key={item.id}>
                        <MenuItemCard item={item} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : activeAisle ? (
              <section className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-extrabold text-gray-900">
                    {activeAisle.aisle.label}
                  </h2>
                  <Link
                    href={`/browse/${activeAisle.section}/${activeAisle.aisle.id}`}
                    className="text-sm font-semibold text-[#ED1C24]"
                  >
                    Full aisle ›
                  </Link>
                </div>
                {aisleItems.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">
                    No products in this aisle yet.
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {aisleItems.map((item) => (
                      <li key={item.id}>
                        <MenuItemCard item={item} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : (
              <>
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-r from-[#ED1C24] to-[#c9171e] p-5 text-white shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                    GraceRun CUHK
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">
                    Apply a voucher at checkout!
                  </h2>
                  <p className="mt-1 max-w-xl text-sm text-white/90">
                    Groceries from Fusion to your CUHK hall lobby. Pay nothing
                    until after delivery.
                  </p>
                </section>

                <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                  <h2 className="text-lg font-extrabold text-gray-900">
                    Recommended for you
                  </h2>
                  <div className="scrollbar-hide -mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-1">
                    {popularItems.map((item, index) => (
                      <TopPickCard key={item.id} item={item} index={index} />
                    ))}
                  </div>
                </section>

                <div id="manual-item" className="mt-4">
                  <CustomItemCard />
                </div>

                <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                  <h2 className="text-lg font-extrabold text-gray-900">
                    You may also like
                  </h2>
                  {productsLoading ? (
                    <p className="py-10 text-center text-sm text-gray-500">
                      Loading products…
                    </p>
                  ) : (
                    <>
                      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {feedVisible.map((item) => (
                          <li key={item.id}>
                            <MenuItemCard item={item} />
                          </li>
                        ))}
                      </ul>
                      <div ref={sentinelRef} className="h-8" aria-hidden />
                      <p className="py-3 text-center text-xs text-gray-500">
                        {feedCount < feedPool.length
                          ? "Loading more…"
                          : "You've seen everything for now."}
                      </p>
                    </>
                  )}
                </section>
              </>
            )}
          </main>

          <div className="sticky top-[57px] hidden h-[calc(100vh-57px)] p-3 xl:block">
            <MenuCartSummary />
          </div>
        </div>

        <OrderActionBar />
      </div>
    </AppShell>
  );
}
