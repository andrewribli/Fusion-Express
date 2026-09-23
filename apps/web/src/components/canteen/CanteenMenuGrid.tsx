"use client";

import { useMemo, useState } from "react";
import { CanteenMenuCard } from "@/components/canteen/CanteenMenuCard";
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

export type PriceSort = "default" | "cheap" | "expensive";

export function PriceSortSelect({
  value,
  onChange,
}: {
  value: PriceSort;
  onChange: (v: PriceSort) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <span className="shrink-0 font-medium">Sort</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PriceSort)}
        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
      >
        <option value="default">Featured</option>
        <option value="cheap">Cheapest First</option>
        <option value="expensive">Most Expensive First</option>
      </select>
    </label>
  );
}

function sortByPrice<T extends { price: number }>(
  items: T[],
  sort: PriceSort,
): T[] {
  if (sort === "default") return items;
  const copy = [...items];
  copy.sort((a, b) =>
    sort === "cheap" ? a.price - b.price : b.price - a.price,
  );
  return copy;
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

export function SimpleItemsGrid({
  items,
  restaurantId,
  orderingEnabled,
  sort,
  groupByMealPeriod,
}: {
  items: SimpleMenuItem[];
  restaurantId: SimpleRestaurantId;
  orderingEnabled: boolean;
  sort: PriceSort;
  groupByMealPeriod: boolean;
}) {
  const active = getActiveMealPeriod();
  const periods = orderedMealPeriods(active);

  if (!groupByMealPeriod) {
    const sorted = sortByPrice(items, sort);
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
        const sectionItems = sortByPrice(
          items.filter((i) => mealPeriodForSimple(i).includes(periodId)),
          sort,
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
}: {
  items: BfItem[];
  orderingEnabled: boolean;
  sort: PriceSort;
}) {
  const sorted = sortByPrice(items, sort);
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
}: {
  items: UcMenuItem[];
  orderingEnabled: boolean;
  sort: PriceSort;
}) {
  const sorted = useMemo(() => sortByPrice(items, sort), [items, sort]);
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
