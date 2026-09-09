"use client";

import { use, useEffect, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { BrowseBreadcrumb } from "@/components/BrowseBreadcrumb";
import { CategoryTabs } from "@/components/CategoryTabs";
import { ItemListRow } from "@/components/ItemListRow";
import { MenuSearch } from "@/components/MenuSearch";
import { OrderActionBar } from "@/components/OrderActionBar";
import {
  getAisle,
  getAislesForSection,
  isValidSection,
  SECTION_META,
  type StoreSection,
} from "@/data/aisles";
import { loadAllProducts, productBelongsToAisle } from "@/lib/firestore";
import { searchItems } from "@/lib/menu";
import { hasSale } from "@/lib/pricing";
import {
  popularCapForAisle,
  topPopularItems,
} from "@/lib/popular-items";
import { useCart } from "@/context/CartContext";
import type { MenuItem } from "@/lib/types";

type SortMode = "popular" | "price-asc" | "price-desc" | "name";

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function sortItems(items: MenuItem[], mode: SortMode): MenuItem[] {
  if (mode === "popular") return items;
  const copy = [...items];
  if (mode === "name") {
    copy.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  } else if (mode === "price-asc") {
    copy.sort((a, b) => a.price - b.price);
  } else {
    copy.sort((a, b) => b.price - a.price);
  }
  return copy;
}

export default function AisleItemsPage({
  params,
}: {
  params: Promise<{ section: string; aisleId: string }>;
}) {
  const { section: sectionParam, aisleId } = use(params);
  const { addItem } = useCart();
  const [search, setSearch] = useState("");
  const [aisleItems, setAisleItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subFilter, setSubFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("popular");
  const [offersOnly, setOffersOnly] = useState(false);

  const section = isValidSection(sectionParam)
    ? (sectionParam as StoreSection)
    : undefined;
  const aisle = section ? getAisle(section, aisleId) : undefined;
  const aisles = section ? getAislesForSection(section) : [];

  useEffect(() => {
    if (!section || !aisle) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const merged = await loadAllProducts();
        const filtered = merged.filter((item) =>
          productBelongsToAisle(item, aisleId, section),
        );

        if (!cancelled) setAisleItems(filtered);
      } catch (err) {
        if (!cancelled) {
          setAisleItems([]);
          setError(
            err instanceof Error ? err.message : "Could not load products.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [section, aisleId, aisle]);

  useEffect(() => {
    setSubFilter(null);
    setOffersOnly(false);
    setSortMode("popular");
  }, [aisleId]);

  const popularCap = popularCapForAisle(aisleId);
  const browsingItems = useMemo(
    () => topPopularItems(aisleItems, popularCap),
    [aisleItems, popularCap],
  );

  const items = useMemo(() => {
    const pool = search.trim() ? aisleItems : browsingItems;
    const matched = searchItems(pool, search);
    const offered = offersOnly ? matched.filter((item) => hasSale(item)) : matched;
    return sortItems(offered, sortMode);
  }, [aisleItems, browsingItems, search, offersOnly, sortMode]);

  const groups = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      const key = item.subcategory?.trim() || "Other";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()].sort(
      (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
    );
  }, [items]);

  const searching = Boolean(search.trim());
  const showSubNav = !searching && groups.length > 1;
  const activeSub =
    subFilter && groups.some(([name]) => name === subFilter)
      ? subFilter
      : groups[0]?.[0];

  function jumpToSub(name: string) {
    setSubFilter(name);
    const el = document.getElementById(`sub-${slugify(name)}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!section || !aisle) notFound();

  const sectionMeta = SECTION_META[section];
  const visibleGroups = searching
    ? [["Search results", items] as const]
    : showSubNav
      ? groups
      : [["Items", items] as const];

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50">
          <AppHeader showBack backHref={`/browse/${section}`} title={aisle.label} />

          <main className="mx-auto w-full max-w-7xl px-4 py-4 pb-36 md:px-6">
            <BrowseBreadcrumb
              items={[
                { label: "Shop Now", href: "/home" },
                { label: sectionMeta.title, href: `/browse/${section}` },
                { label: aisle.label },
              ]}
            />

            <h1 className="text-xl font-bold text-gray-900">{aisle.label}</h1>
            <p className="mt-1 text-sm text-gray-500">{sectionMeta.subtitle}</p>

            <div className="sticky top-[57px] z-30 -mx-4 mt-4 bg-gray-50/95 px-4 py-2 backdrop-blur">
              <CategoryTabs
                section={section}
                aisles={aisles}
                activeAisleId={aisle.id}
              />
            </div>

            <div className="mt-3">
              <label className="mb-1.5 block text-sm font-semibold text-gray-900">
                Search
              </label>
              <MenuSearch
                items={aisleItems}
                value={search}
                onChange={setSearch}
                onSelectItem={(item) => {
                  addItem(item);
                  setSearch("");
                }}
                placeholder={`Search this aisle (all items, not just the top ${popularCap})…`}
              />
              {!search.trim() && aisleItems.length > popularCap ? (
                <p className="mt-1.5 text-xs text-gray-500">
                  Showing {popularCap} popular items. Search to find
                  anything else in this aisle.
                </p>
              ) : null}
            </div>

            <div className="relative mt-4">
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-gray-50 to-transparent" />
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <label className="relative shrink-0">
                  <span className="sr-only">Sort</span>
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="appearance-none rounded-full border border-gray-200 bg-white py-1.5 pl-3 pr-7 text-xs font-semibold text-gray-800"
                  >
                    <option value="popular">Sort: Popular</option>
                    <option value="price-asc">Sort: Price low–high</option>
                    <option value="price-desc">Sort: Price high–low</option>
                    <option value="name">Sort: Name</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setOffersOnly((v) => !v)}
                  aria-pressed={offersOnly}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                    offersOnly
                      ? "bg-[#ED1C24] text-white"
                      : "border border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  Offers
                </button>
                {showSubNav
                  ? groups.map(([name, groupItems]) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => jumpToSub(name)}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                          name === activeSub
                            ? "bg-gray-900 text-white"
                            : "border border-gray-200 bg-white text-gray-700"
                        }`}
                      >
                        {name} ({groupItems.length})
                      </button>
                    ))
                  : null}
              </div>
            </div>

            {loading ? (
              <div className="mt-4 rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-sm text-gray-600">Loading products…</p>
              </div>
            ) : error ? (
              <div className="mt-4 rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-sm text-gray-600">Could not load products.</p>
                <p className="mt-1 text-xs text-gray-400">{error}</p>
              </div>
            ) : items.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-sm text-gray-600">
                  {offersOnly
                    ? "No offers in this aisle right now."
                    : search
                      ? "No items match your search."
                      : "No items found in this aisle yet."}
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-8">
                {visibleGroups.map(([name, groupItems]) => (
                  <section
                    key={name}
                    id={`sub-${slugify(name)}`}
                    className="scroll-mt-36"
                  >
                    <h2 className="text-lg font-bold text-gray-900">{name}</h2>
                    <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {groupItems.map((item) => (
                        <ItemListRow key={item.id} item={item} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </main>
          <OrderActionBar />
        </div>
    </AppShell>
  );
}
