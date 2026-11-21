"use client";

import { useMemo, useState } from "react";
import { CanteenMenuCard } from "@/components/canteen/CanteenMenuCard";
import {
  CANTEEN_MEAL_PERIODS,
  getActiveMealPeriod,
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

  if (!groupByMealPeriod) {
    if (sort !== "default") {
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
    const sections: Array<{ category: string; items: SimpleMenuItem[] }> = [];
    const map = new Map<string, SimpleMenuItem[]>();
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    for (const [category, sectionItems] of map) {
      sections.push({ category, items: sectionItems });
    }
    return (
      <div className="mt-4 space-y-8">
        {sections.map((section) => (
          <section key={section.category}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
              {section.category}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {section.items.map((item) => (
                <CanteenMenuCard
                  key={item.id}
                  kind="simple"
                  item={item}
                  restaurantId={restaurantId}
                  orderingEnabled={orderingEnabled}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  // Outside meal periods: show full menu for browsing (ordering still gated).
  if (!active) {
    const sorted = sortByPrice(items, sort);
    return (
      <div className="mt-4 space-y-4">
        <p className="text-center text-sm text-gray-500">
          Outside meal periods — browsing the full menu. Ordering unlocks during
          breakfast / lunch / tea / dinner.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sorted.map((item) => (
            <CanteenMenuCard
              key={item.id}
              kind="simple"
              item={item}
              restaurantId={restaurantId}
              orderingEnabled={false}
            />
          ))}
        </div>
      </div>
    );
  }

  /** Only the current HKT meal period is orderable / visible while open. */
  const visiblePeriod = active;
  const slot = CANTEEN_MEAL_PERIODS[visiblePeriod];
  const sectionItems = sortByPrice(
    items.filter((i) => mealPeriodForSimple(i).includes(visiblePeriod)),
    sort,
  );

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2 rounded-xl bg-[#ED1C24]/10 px-3 py-2 ring-1 ring-[#ED1C24]/30">
        <div>
          <h2 className="text-sm font-bold text-[#ED1C24]">
            {slot.label} · Now
          </h2>
          <p className="text-xs text-gray-500">
            {slot.start} – {slot.end} · only this period&apos;s menu is shown
          </p>
        </div>
      </div>
      {sectionItems.length === 0 ? (
        <p className="text-center text-sm text-gray-500">
          No {slot.label.toLowerCase()} items for this canteen right now.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {sectionItems.map((item) => (
            <CanteenMenuCard
              key={item.id}
              kind="simple"
              item={item}
              restaurantId={restaurantId}
              orderingEnabled={orderingEnabled}
            />
          ))}
        </div>
      )}
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
