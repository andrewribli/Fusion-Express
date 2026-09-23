"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { CustomItemCard } from "@/components/CustomItemCard";
import { MenuItemCard } from "@/components/MenuItemCard";
import { OrderActionBar } from "@/components/OrderActionBar";
import { useCampus } from "@/context/CampusContext";
import {
  CATEGORY_LABELS,
  productsByCategory,
  recommendedProducts,
  searchProducts,
  SIDEBAR_CATEGORIES,
  TASTE_PRODUCTS,
  type SidebarCategoryId,
} from "@/data/cityu/taste-products";

/**
 * CityU Taste supermarket home — light shop chrome, campus-scoped catalog.
 */
export function TasteShopHome() {
  const { setCampus, config } = useCampus();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    SidebarCategoryId | "all"
  >("all");

  useEffect(() => {
    setCampus("cityu");
  }, [setCampus]);

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

  return (
    <AppShell>
      <AppHeader showBack backHref="/" title={config.supermarket} />
      <main className="mx-auto max-w-7xl px-4 py-4 pb-28">
        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#ED1C24]">
            {config.brandLabel}
          </p>
          <h1 className="mt-1 text-xl font-bold text-gray-900">
            {config.supermarket} @ Festival Walk
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Prototype catalog — Halls 1–12 lobby delivery.
          </p>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Taste products"
            className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-[#ED1C24] focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20"
          />
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              setActiveCategory("all");
              setSearch("");
            }}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${
              activeCategory === "all" && !searching
                ? "bg-[#ED1C24] text-white"
                : "bg-white text-gray-700 ring-1 ring-gray-200"
            }`}
          >
            All
          </button>
          {SIDEBAR_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setSearch("");
              }}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${
                activeCategory === cat.id && !searching
                  ? "bg-[#ED1C24] text-white"
                  : "bg-white text-gray-700 ring-1 ring-gray-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {searching ? (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Search results ({results.length})
            </h2>
            {results.length === 0 ? (
              <p className="text-sm text-gray-500">No matches.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {results.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {activeCategory === "all" && (
              <section className="mb-6">
                <h2 className="mb-3 text-sm font-semibold text-gray-900">
                  Recommended
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {recommended.map((item) => (
                    <MenuItemCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                {activeLabel}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {categoryItems.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          </>
        )}

        <CustomItemCard className="mt-6" />
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/cityu" className="font-semibold text-[#ED1C24] underline">
            Back to CityU channels
          </Link>
        </p>
      </main>
      <OrderActionBar />
    </AppShell>
  );
}
