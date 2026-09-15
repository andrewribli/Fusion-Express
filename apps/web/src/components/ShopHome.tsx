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
import { SECTION_META } from "@/data/aisles";
import { getItemImage } from "@/data/aisle-images";
import { QUICK_CATEGORIES } from "@/data/quick-categories";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { loadAllProducts } from "@/lib/firestore";
import { resolveHomePopularItems } from "@/lib/home-popular";
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
  const { addItem } = useCart();
  const badge = pickBadge(item, index);
  const image = getItemImage(item);

  return (
    <button
      type="button"
      onClick={() => addItem(item)}
      className="shop-surface flex w-[42vw] max-w-[160px] shrink-0 flex-col overflow-hidden rounded-xl text-left sm:w-[150px]"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}
    >
      <div className="relative aspect-square w-full bg-[#f7f7f7]">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            className="object-contain p-2"
            sizes="160px"
          />
        ) : null}
        <span
          className="absolute bottom-1.5 left-1.5 max-w-[90%] truncate rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
          style={{ backgroundColor: "rgba(237,28,36,0.92)" }}
        >
          {badge}
        </span>
      </div>
      <div className="flex flex-col gap-1 px-2.5 pb-2.5 pt-2">
        <p
          className="line-clamp-2 min-h-[2.4rem] text-[12px] font-medium leading-snug"
          style={{ color: "#222" }}
        >
          {item.name}
        </p>
        <p
          className="text-[15px] font-extrabold leading-none"
          style={{ color: "#ED1C24" }}
        >
          {priceLabel(item)}
        </p>
      </div>
    </button>
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
        className="flex h-10 w-full min-w-0 items-center gap-0.5 rounded-full pl-2.5 pr-1"
        style={{ backgroundColor: "#ffffff" }}
      >
        <input
          ref={inputRef}
          id="home-search"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          placeholder="Search Fusion"
          className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm outline-none"
          style={{ color: "#111" }}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ color: "#555" }}
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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
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
          className="shop-surface absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl py-1 shadow-lg"
          style={{ border: "1px solid rgba(0,0,0,0.08)" }}
        >
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-red-50"
                style={{ color: "#111" }}
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
    if (window.location.hash === "#search") {
      searchRef.current?.focus();
    }
    if (window.location.hash === "#manual-item") {
      document.getElementById("manual-item")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [productsLoading]);

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
      <div className="shop-page min-h-screen">
        <header className="sticky top-0 z-50" style={{ backgroundColor: "#ED1C24" }}>
          <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-2.5 py-2 sm:gap-2 sm:px-4">
            <Link href="/" className="hidden shrink-0 sm:block">
              <span className="text-sm font-extrabold tracking-tight text-white">
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
              href={itemCount > 0 ? (user ? "/cart" : "/login?next=/cart") : "/cart"}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
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
                  style={{ backgroundColor: "#fff", color: "#ED1C24" }}
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
            <div className="hidden shrink-0 sm:block">
              <AccountMenu hideThemeChip />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl pb-36">
          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start xl:gap-6 xl:px-4 xl:pt-4">
            <div className="min-w-0">
              <section className="shop-surface px-2 py-3" aria-label="Categories">
                <div className="scrollbar-hide flex gap-1 overflow-x-auto px-1">
                  {QUICK_CATEGORIES.map((cat) => (
                    <Link
                      key={cat.id}
                      href={cat.href}
                      className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 px-0.5 text-center"
                    >
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-full text-[22px]"
                        style={{ backgroundColor: "#ffe8e8" }}
                        aria-hidden
                      >
                        {cat.emoji}
                      </span>
                      <span className="shop-label line-clamp-2 text-[11px] font-semibold leading-tight">
                        {cat.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>

              {searching ? (
                <section className="mt-2 px-3">
                  <h2 className="text-sm font-bold" style={{ color: "#111" }}>
                    Results for “{search.trim()}”
                  </h2>
                  {searchResults.length === 0 ? (
                    <p className="shop-muted mt-4 text-center text-sm">
                      No matches. Try another name or add a custom item below.
                    </p>
                  ) : (
                    <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
                  <section className="shop-surface mt-2 px-3 py-3">
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <h2 className="text-base font-extrabold" style={{ color: "#111" }}>
                        TOP Picks
                      </h2>
                      <Link
                        href="/browse/dry"
                        className="shrink-0 text-xs font-semibold"
                        style={{ color: "#ED1C24" }}
                      >
                        Curated ›
                      </Link>
                    </div>
                    <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
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

                  <section className="mt-2 grid grid-cols-2 gap-2 px-3">
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

                  <div id="manual-item" className="mt-2 px-3">
                    <CustomItemCard />
                  </div>

                  <section className="shop-surface mt-2 px-3 py-3">
                    <h2 className="text-base font-extrabold" style={{ color: "#111" }}>
                      You may also like
                    </h2>
                    {productsLoading ? (
                      <p className="shop-muted py-10 text-center text-sm">
                        Loading products…
                      </p>
                    ) : (
                      <>
                        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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

            <div className="hidden xl:sticky xl:top-20 xl:block">
              <MenuCartSummary />
            </div>
          </div>
        </main>

        <OrderActionBar />
      </div>
    </AppShell>
  );
}
