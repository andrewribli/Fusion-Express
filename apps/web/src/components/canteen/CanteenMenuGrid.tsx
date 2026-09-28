"use client";

import { useMemo, useState } from "react";
import { CanteenMenuCard } from "@/components/canteen/CanteenMenuCard";
import { useFavorites } from "@/context/FavoritesContext";
import {
  CANTEEN_MEAL_PERIODS,
  getActiveMealPeriod,
  orderedMealPeriods,
  type MealPeriodId,
} from "@/data/canteen/canteen-config";
import type { SimpleMenuItem } from "@/data/canteen/simple-menu";
import type { SimpleRestaurantId } from "@/data/canteen/simple-menu";
import type { MenuItem as BfItem } from "@/data/canteen/bf-menu";
import type { UcMenuItem } from "@/data/canteen/uc-menu";
import {
  canteenFavoriteId,
  filterFavoritesOnly,
  sortFavoritesFirst,
} from "@/lib/favorites";

export type PriceSort = "default" | "cheap" | "expensive" | "favorites" | "az";

export function PriceSortSelect({
  value,
  onChange,
  favoritesOnly,
  onFavoritesOnlyChange,
}: {
  value: PriceSort;
  onChange: (v: PriceSort) => void;
  favoritesOnly?: boolean;
  onFavoritesOnlyChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <span className="shrink-0 font-medium">Sort</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as PriceSort)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
        >
          <option value="favorites">Favorites first</option>
          <option value="default">Featured</option>
          <option value="cheap">Price ↑</option>
          <option value="expensive">Price ↓</option>
          <option value="az">A–Z</option>
        </select>
      </label>
      {onFavoritesOnlyChange ? (
        <button
          type="button"
          aria-pressed={Boolean(favoritesOnly)}
          onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            favoritesOnly
              ? "bg-[#ED1C24] text-white"
              : "border border-gray-200 bg-white text-gray-700"
          }`}
        >
          ♥ Favorites only
        </button>
      ) : null}
    </div>
  );
}

function sortMenuItems<T extends { id: string; price: number; name: string }>(
  items: T[],
  sort: PriceSort,
  favoriteSet: Set<string>,
  favoriteIdFor: (item: T) => string,
): T[] {
  let list = [...items];
  const byPriceAsc = (a: T, b: T) => a.price - b.price;
  const byPriceDesc = (a: T, b: T) => b.price - a.price;
  const byName = (a: T, b: T) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" });

  if (sort === "cheap") list.sort(byPriceAsc);
  else if (sort === "expensive") list.sort(byPriceDesc);
  else if (sort === "az") list.sort(byName);
  else if (sort === "favorites") {
    list = sortFavoritesFirst(list, favoriteIdFor, favoriteSet, byPriceAsc);
  }
  return list;
}

function prepareItems<T extends { id: string; price: number; name: string }>(
  items: T[],
  sort: PriceSort,
  favoritesOnly: boolean,
  favoriteSet: Set<string>,
  favoriteIdFor: (item: T) => string,
): T[] {
  let list = favoritesOnly
    ? filterFavoritesOnly(items, favoriteIdFor, favoriteSet)
    : items;
  return sortMenuItems(list, sort, favoriteSet, favoriteIdFor);
}

function mealPeriodForSimple(item: SimpleMenuItem): MealPeriodId[] {
  if (item.mealPeriods?.length) return item.mealPeriods;
  const d = `${item.name} ${item.description ?? ""}`.toLowerCase();
  if (d.includes("早餐") || d.includes("breakfast")) return ["breakfast"];
  if (d.includes("午餐") || d.includes("lunch")) return ["lunch", "dinner"];
  if (d.includes("tea") || d.includes("茶")) return ["tea"];
  if (item.category === "drinks") {
    return ["breakfast", "lunch", "tea", "dinner"];
  }
  return ["lunch", "tea", "dinner"];
}

function EmptyFavorites() {
  return (
    <p className="mt-4 rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-600">
      You haven&apos;t favorited anything yet. Tap the ♥ on any item to save it
      here.
    </p>
  );
}

export function SimpleItemsGrid({
  items,
  restaurantId,
  orderingEnabled,
  sort,
  favoritesOnly = false,
  groupByMealPeriod,
}: {
  items: SimpleMenuItem[];
  restaurantId: SimpleRestaurantId;
  orderingEnabled: boolean;
  sort: PriceSort;
  favoritesOnly?: boolean;
  groupByMealPeriod: boolean;
}) {
  const { favoriteSet } = useFavorites();
  const favId = (item: SimpleMenuItem) =>
    canteenFavoriteId(restaurantId, item.id);
  const active = getActiveMealPeriod();
  const periods = orderedMealPeriods(active);

  if (!groupByMealPeriod) {
    const sorted = prepareItems(items, sort, favoritesOnly, favoriteSet, favId);
    if (favoritesOnly && sorted.length === 0) return <EmptyFavorites />;
    return (
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((item) => (
          <CanteenMenuCard
            key={item.id}
            kind="simple"
            item={item}
            restaurantId={restaurantId}
            orderingEnabled={orderingEnabled}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-8">
      {periods.map((periodId) => {
        const slot = CANTEEN_MEAL_PERIODS[periodId];
        const isActive = active === periodId;
        const sectionItems = prepareItems(
          items.filter((i) => mealPeriodForSimple(i).includes(periodId)),
          sort,
          favoritesOnly,
          favoriteSet,
          favId,
        );
        if (sectionItems.length === 0) return null;
        return (
          <section
            key={periodId}
            className={isActive ? "" : "opacity-55"}
            aria-label={`${slot.label} menu`}
          >
            <div
              className={`mb-3 flex flex-wrap items-end justify-between gap-2 rounded-xl px-3 py-2 ${
                isActive
                  ? "bg-[#ED1C24]/10 ring-1 ring-[#ED1C24]/30"
                  : "bg-gray-50"
              }`}
            >
              <div>
                <h2
                  className={`text-sm font-bold ${
                    isActive ? "text-[#ED1C24]" : "text-gray-700"
                  }`}
                >
                  {slot.label}
                  {isActive ? " · Now" : ""}
                </h2>
                <p className="text-xs text-gray-500">
                  {slot.start} – {slot.end}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {sectionItems.map((item) => (
                <CanteenMenuCard
                  key={`${periodId}-${item.id}`}
                  kind="simple"
                  item={item}
                  restaurantId={restaurantId}
                  orderingEnabled={orderingEnabled && isActive}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function BfItemsGrid({
  items,
  orderingEnabled,
  sort,
  favoritesOnly = false,
}: {
  items: BfItem[];
  orderingEnabled: boolean;
  sort: PriceSort;
  favoritesOnly?: boolean;
}) {
  const { favoriteSet } = useFavorites();
  const sorted = prepareItems(
    items,
    sort,
    favoritesOnly,
    favoriteSet,
    (item) => canteenFavoriteId("benjamin-franklin", item.id),
  );
  if (favoritesOnly && sorted.length === 0) return <EmptyFavorites />;
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {sorted.map((item) => (
        <CanteenMenuCard
          key={item.id}
          kind="bf"
          item={item}
          restaurantId="benjamin-franklin"
          orderingEnabled={orderingEnabled}
        />
      ))}
    </div>
  );
}

export function UcItemsGrid({
  items,
  orderingEnabled,
  sort,
  favoritesOnly = false,
}: {
  items: UcMenuItem[];
  orderingEnabled: boolean;
  sort: PriceSort;
  favoritesOnly?: boolean;
}) {
  const { favoriteSet } = useFavorites();
  const sorted = useMemo(
    () =>
      prepareItems(
        items,
        sort,
        favoritesOnly,
        favoriteSet,
        (item) => canteenFavoriteId("uc-canteen", item.id),
      ),
    [items, sort, favoritesOnly, favoriteSet],
  );
  if (favoritesOnly && sorted.length === 0) return <EmptyFavorites />;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {sorted.map((item) => (
        <CanteenMenuCard
          key={item.id}
          kind="uc"
          item={item}
          restaurantId="uc-canteen"
          orderingEnabled={orderingEnabled}
        />
      ))}
    </div>
  );
}

export function usePriceSort() {
  return useState<PriceSort>("default");
}

export function useFavoritesOnly() {
  return useState(false);
}
