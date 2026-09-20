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
import { AislePhotoButton } from "@/components/AislePhotoButton";
import { CustomItemCard } from "@/components/CustomItemCard";
import { MenuCartSummary } from "@/components/MenuCartSummary";
import { MenuItemCard } from "@/components/MenuItemCard";
import { OrderActionBar } from "@/components/OrderActionBar";
import { ProductCardQtyControl } from "@/components/ProductCardQtyControl";
import { ProductQuickAddModal } from "@/components/ProductQuickAddModal";
import { SECTION_META } from "@/data/aisles";
import { getItemImage } from "@/data/aisle-images";
import { QUICK_CATEGORIES } from "@/data/quick-categories";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { loadAllProducts } from "@/lib/firestore";
import { resolveHomePopularItems } from "@/lib/home-popular";
import { runnerEntryHref } from "@/lib/nav";
import { useManualItemModal } from "@/lib/manual-item-modal";
import { searchItems } from "@/lib/menu";
import { popularityScore, topPopularItems } from "@/lib/popular-items";
import { formatMenuPrice, type MenuItem } from "@/lib/types";

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

  const dryMeta = SECTION_META.dry;
  const coldMeta = SECTION_META.refrigerated;

  return (
    <AppShell>
      <div className="shop-page min-h-screen" style={{ backgroundColor: "#f3f4f6" }}>
        <header className="sticky top-0 z-50" style={{ backgroundColor: "#ED1C24" }}>
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:px-4">
            <Link
              href="/"
              onClick={() => setSearch("")}
              className="hidden shrink-0 sm:block"
              aria-label="GraceRun home"
            >
              <span className="text-base font-extrabold tracking-tight text-white">
                GraceRun
              </span>
            </Link>
            <HomeSearchBar
              products={products}
              value={search}
              onChange={setSearch}
              inputRef={searchRef}
              onSelect={(item) => {
                addItem(item);
                setSearch("");
              }}
            />
            <Link
              href="/cart"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
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
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                  style={{ backgroundColor: "#ffffff", color: "#ED1C24" }}
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
            <Link
              href={runnerEntryHref({
                loggedIn: Boolean(user),
                canRunnerMode,
              })}
              onClick={() => {
                if (canRunnerMode) setMode("runner");
              }}
              className="hidden min-h-10 shrink-0 items-center rounded-full bg-white px-3 py-2 text-xs font-bold shadow-sm hover:bg-red-50 sm:inline-flex"
              style={{ color: "#ED1C24" }}
            >
              Switch to Runner
            </Link>
            <div className="hidden shrink-0 sm:block">
              <AccountMenu hideThemeChip />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-0 pb-36 sm:px-4">
          {guestBrowse && (
            <div className="mx-3 mt-3 rounded-xl border border-[#ED1C24]/30 bg-red-50 px-4 py-3 text-sm text-gray-800 sm:mx-0">
              <p className="font-semibold text-gray-900">Ordering as guest</p>
              <p className="mt-0.5 text-xs text-gray-600">
                Add items, then checkout with your dorm and lobby — no account
                required. We create your guest profile when you place the order.
              </p>
              {itemCount > 0 && (
                <Link
                  href="/checkout"
                  className="mt-2 inline-flex text-xs font-bold text-[#ED1C24] underline"
                >
                  Continue to checkout ({itemCount} item
                  {itemCount === 1 ? "" : "s"})
                </Link>
              )}
            </div>
          )}
          <div className="space-y-4 pt-0 sm:pt-4 xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start xl:gap-4 xl:space-y-0">
            <div className="min-w-0 space-y-4">
              <section
                className="shop-surface rounded-none px-3 py-4 shadow-sm sm:rounded-2xl"
                style={{ backgroundColor: "#ffffff" }}
                aria-label="Categories"
              >
                <div className="scrollbar-hide flex gap-2 overflow-x-auto px-1">
                  {QUICK_CATEGORIES.map((cat) =>
                    cat.id === "manual" ? (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSearch("");
                          openManualItem();
                        }}
                        className="flex w-[76px] shrink-0 flex-col items-center gap-2 px-0.5 text-center"
                      >
                        <span
                          className="flex h-14 w-14 items-center justify-center rounded-2xl text-[26px]"
                          style={{ backgroundColor: "#ffe4e6" }}
                          aria-hidden
                        >
                          {cat.emoji}
                        </span>
                        <span
                          className="shop-label line-clamp-2 text-[12px] font-semibold leading-tight"
                          style={{ color: "#111111" }}
                        >
                          {cat.label}
                        </span>
                      </button>
                    ) : (
                      <Link
                        key={cat.id}
                        href={cat.href}
                        onClick={() => setSearch("")}
                        className="flex w-[76px] shrink-0 flex-col items-center gap-2 px-0.5 text-center"
                      >
                        <span
                          className="flex h-14 w-14 items-center justify-center rounded-2xl text-[26px]"
                          style={{ backgroundColor: "#ffe4e6" }}
                          aria-hidden
                        >
                          {cat.emoji}
                        </span>
                        <span
                          className="shop-label line-clamp-2 text-[12px] font-semibold leading-tight"
                          style={{ color: "#111111" }}
                        >
                          {cat.label}
                        </span>
                      </Link>
                    ),
                  )}
                </div>
              </section>

              {searching ? (
                <section
                  className="shop-surface rounded-2xl px-4 py-4 shadow-sm"
                  style={{ backgroundColor: "#ffffff" }}
                >
                  <h2 className="text-base font-bold" style={{ color: "#111111" }}>
                    Results for “{search.trim()}”
                  </h2>
                  {searchResults.length === 0 ? (
                    <p className="shop-muted mt-4 text-center text-sm">
                      No matches. Try another name or add a custom item below.
                    </p>
                  ) : (
                    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {searchResults.map((item) => (
                        <li key={item.id}>
                          <MenuItemCard item={item} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : (
                <>
                  <section
                    className="shop-surface rounded-none px-4 py-4 shadow-sm sm:rounded-2xl"
                    style={{ backgroundColor: "#ffffff" }}
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h2 className="text-lg font-extrabold" style={{ color: "#111111" }}>
                        TOP Picks
                      </h2>
                      <Link
                        href="/browse/dry"
                        className="shrink-0 text-sm font-semibold"
                        style={{ color: "#ED1C24" }}
                      >
                        Curated ›
                      </Link>
                    </div>
                    <div className="scrollbar-hide -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                      {popularItems.map((item, index) => (
                        <TopPickCard key={item.id} item={item} index={index} />
                      ))}
                      {!productsLoading && popularItems.length === 0 && (
                        <p className="shop-muted px-2 text-sm">
                          Popular items will show up here.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="grid grid-cols-2 gap-3 px-3 sm:px-0">
                    <AislePhotoButton
                      href="/browse/dry"
                      imageSrc="/images/aisle-dry.png"
                      imageAlt="Groceries aisle"
                      title="Groceries"
                      subtitle={dryMeta.subtitle}
                      sideLabel="Left aisle"
                      compact
                    />
                    <AislePhotoButton
                      href="/browse/refrigerated"
                      imageSrc="/images/aisle-refrigerated.png"
                      imageAlt="Fresh food counter"
                      title="Fresh Food"
                      subtitle={coldMeta.subtitle}
                      sideLabel="Right aisle"
                      compact
                    />
                  </section>

                  <div id="manual-item" className="px-3 sm:px-0">
                    <CustomItemCard />
                  </div>

                  <section
                    className="shop-surface rounded-none px-4 py-4 shadow-sm sm:rounded-2xl"
                    style={{ backgroundColor: "#ffffff" }}
                  >
                    <h2 className="text-lg font-extrabold" style={{ color: "#111111" }}>
                      You may also like
                    </h2>
                    {productsLoading ? (
                      <p className="shop-muted py-10 text-center text-sm">
                        Loading products…
                      </p>
                    ) : (
                      <>
                        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          {feedVisible.map((item) => (
                            <li key={item.id}>
                              <MenuItemCard item={item} />
                            </li>
                          ))}
                        </ul>
                        <div ref={sentinelRef} className="h-8" aria-hidden />
                        <p className="shop-muted py-3 text-center text-xs">
                          {feedCount < feedPool.length
                            ? "Loading more…"
                            : "You've seen everything for now."}
                        </p>
                      </>
                    )}
                  </section>
                </>
              )}
            </div>

            <div className="hidden px-0 xl:sticky xl:top-20 xl:block">
              <MenuCartSummary />
            </div>
          </div>
        </main>

        <OrderActionBar />
      </div>
    </AppShell>
  );
}
