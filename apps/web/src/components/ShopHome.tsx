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
import { CustomerNotificationBell } from "@/components/CustomerNotificationBell";
import { RunnerQueueBell } from "@/components/RunnerQueueBell";
import { DRY_AISLES, REFRIGERATED_AISLES } from "@/data/aisles";
import { getItemImage } from "@/data/aisle-images";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { loadAllProducts } from "@/lib/firestore";
import { resolveHomePopularItems } from "@/lib/home-popular";
import { useRunnerEntry } from "@/lib/use-runner-entry";
import { useManualItemModal } from "@/lib/manual-item-modal";
import { getAisleItems, searchItems } from "@/lib/menu";
import { popularityScore, topPopularItems } from "@/lib/popular-items";
import { formatMenuPriceLabel, type MenuItem } from "@/lib/types";
import { AppLogo } from "@/components/AppLogo";
import { GraceRunWordmark } from "@/components/GraceRunWordmark";
import type { Aisle, StoreSection } from "@/data/aisles";
import { rankItemsByQuery } from "@fusion-express/shared/search-rank";

const BATCH = 24;
const BADGES = ["Highly rated", "In demand", "Lowest price"] as const;

function pickBadge(item: MenuItem, index: number): string {
  if (item.salePrice != null && item.salePrice < item.price) return "Lowest price";
  if (popularityScore(item) > 9000) return "In demand";
  return BADGES[index % BADGES.length];
}

function priceLabel(item: MenuItem): string {
  return formatMenuPriceLabel(item);
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
  const suggestions = useMemo(() => {
    const q = value.trim();
    if (!q) return [];
    return rankItemsByQuery(products, q).slice(0, 10);
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
          id="home-search"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder="Search your meal"
          className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          autoComplete="off"
          aria-label="Search your meal"
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
  const { user } = useUser();
  const runnerEntry = useRunnerEntry("cuhk");
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

            {/* Mobile: text wordmark only; drops below 360px so search stays ≥140px. */}
            <GraceRunWordmark href="/cuhk" className="sm:hidden" />

            <Link
              href="/cuhk"
              onClick={() => {
                setSearch("");
                selectAisle(null);
              }}
              className="hidden shrink-0 items-center gap-2 sm:flex"
              aria-label="CUHK home"
            >
              <AppLogo size={36} className="h-9 w-9" />
              <span className="text-sm font-extrabold tracking-tight text-gray-900">
                GraceRun
              </span>
            </Link>
            <Link
              href="/cuhk"
              className="hidden shrink-0 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-800 hover:border-[#ED1C24] hover:text-[#ED1C24] lg:inline-flex"
            >
              CUHK home
            </Link>

            <div className="hidden min-w-0 max-w-[240px] flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm md:flex xl:max-w-[320px]">
              <span className="text-gray-400" aria-hidden>
                📍
              </span>
              <span className="truncate text-gray-700">
                Deliver to CUHK hall lobby · Fusion supermarket
              </span>
            </div>

            <div className="relative min-w-[140px] flex-1 md:min-w-[400px] md:max-w-xl">
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

            {/* Desktop: both bells (distinct). Mobile: runner bell lives in hamburger so search+cart win. */}
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <CustomerNotificationBell className="!h-11 !w-11 !rounded-full" />
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
              aria-label="Close categories"
              onClick={() => setMobileCatsOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-[min(88vw,320px)] flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-3">
                <p className="text-sm font-bold text-gray-900">Categories</p>
                <div className="flex items-center gap-2">
                  {/* Mobile: only runner available-order bell in drawer (customer notifications too for parity). */}
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

          <main className="min-w-0 px-3 py-4 pr-14 pb-[calc(16rem+env(safe-area-inset-bottom,0px))] sm:px-4 sm:pr-4 md:pb-28">
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
                <section className="rounded-2xl border border-gray-200 bg-white p-4">
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
