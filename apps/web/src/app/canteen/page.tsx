"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShopLayout } from "@/components/ShopLayout";
import { MENU as BF_MENU } from "@/data/canteen/bf-menu";
import { getCollege } from "@/data/canteen/colleges";
import { canteenFoodImage } from "@/data/canteen/food-images";
import { pinCanteenListOrder } from "@fusion-express/shared/canteen-list-order";
import { RESTAURANTS, type Restaurant } from "@/data/canteen/restaurants";
import {
  getSimpleMenu,
  isSimpleMenuRestaurant,
} from "@/data/canteen/simple-menu";
import { UC_MENU } from "@/data/canteen/uc-menu";
import {
  closedBannerText,
  isCanteenOpenByConfig,
} from "@/lib/canteen/hours";
import type { MenuItem } from "@/lib/types";

type DishHit = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
};

type ListSort = "default" | "cheap" | "expensive" | "distance";

const SORT_OPTIONS: Array<{ id: ListSort; label: string }> = [
  { id: "default", label: "Featured" },
  { id: "cheap", label: "Cheapest first" },
  { id: "expensive", label: "Most expensive" },
  { id: "distance", label: "Distance" },
];

function allDishHits(): DishHit[] {
  const hits: DishHit[] = [];
  for (const r of RESTAURANTS.filter((x) => x.menuReady)) {
    if (r.id === "benjamin-franklin") {
      for (const item of BF_MENU) {
        hits.push({
          id: item.id,
          restaurantId: r.id,
          restaurantName: r.shortName,
          name: item.name,
          description: item.description,
          price: item.price,
          image: canteenFoodImage(item.id, item.category),
        });
      }
      continue;
    }
    if (r.id === "uc-canteen") {
      for (const item of UC_MENU) {
        const category = /drink|tea|coffee|juice|beverage|soup/i.test(
          item.category,
        )
          ? "drinks"
          : /dessert|sweet|cake|ice/i.test(item.category)
            ? "dessert"
            : /snack|side|bun|bread|dim/i.test(item.category)
              ? "snacks"
              : "mains";
        hits.push({
          id: item.id,
          restaurantId: r.id,
          restaurantName: r.shortName,
          name: item.nameZh ? `${item.name} (${item.nameZh})` : item.name,
          description: item.description,
          price: item.price,
          image: canteenFoodImage(item.id, category),
        });
      }
      continue;
    }
    if (isSimpleMenuRestaurant(r.id)) {
      for (const item of getSimpleMenu(r.id) ?? []) {
        hits.push({
          id: item.id,
          restaurantId: r.id,
          restaurantName: r.shortName,
          name: item.name,
          description: item.description,
          price: item.price,
          image: item.image,
        });
      }
    }
  }
  return hits;
}

function minVenuePrice(restaurantId: string, dishes: DishHit[]): number {
  const prices = dishes
    .filter((d) => d.restaurantId === restaurantId)
    .map((d) => d.price);
  if (!prices.length) return Number.POSITIVE_INFINITY;
  return Math.min(...prices);
}

export default function CanteenIndexPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ListSort>("default");
  const dishes = useMemo(() => allDishHits(), []);

  const q = search.trim().toLowerCase();
  const dishResults = useMemo(() => {
    if (!q) return [];
    let list = dishes.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q) ||
        d.restaurantName.toLowerCase().includes(q),
    );
    if (sort === "cheap") {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sort === "expensive") {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (sort === "distance") {
      const order = new Map<string, number>(
        RESTAURANTS.map((r) => [r.id, r.campusWalkOrder]),
      );
      list = [...list].sort(
        (a, b) =>
          (order.get(a.restaurantId) ?? 999) -
          (order.get(b.restaurantId) ?? 999),
      );
    }
    return list;
  }, [dishes, q, sort]);

  const venues = useMemo(() => {
    let list: Restaurant[] = [...RESTAURANTS];
    if (sort === "distance") {
      list.sort((a, b) => a.campusWalkOrder - b.campusWalkOrder);
    } else if (sort === "cheap" || sort === "expensive") {
      list.sort((a, b) => {
        const pa = minVenuePrice(a.id, dishes);
        const pb = minVenuePrice(b.id, dishes);
        return sort === "cheap" ? pa - pb : pb - pa;
      });
    } else {
      list = pinCanteenListOrder(list);
    }
    return list;
  }, [sort, dishes]);

  const searchProducts = useMemo<MenuItem[]>(
    () =>
      (q ? dishResults : dishes).slice(0, 40).map((d) => ({
        id: `canteen-dish:${d.restaurantId}:${d.id}`,
        name: `${d.name} · ${d.restaurantName}`,
        category: "other",
        price: d.price,
        unit: "each",
        image: d.image,
        priceType: "fixed",
        runnerInputsPrice: false,
        inStock: true,
        sortOrder: 0,
        weightKg: 0,
      })),
    [dishes, dishResults, q],
  );

  const sidebar = (
    <nav className="px-2 py-2">
      {venues.map((r) => (
        <Link
          key={r.id}
          href={`/canteen/${r.id}`}
          className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          {r.shortName}
          {!r.menuReady ? (
            <span className="ml-2 text-[10px] font-semibold uppercase text-gray-400">
              Soon
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );

  return (
    <ShopLayout
      deliveryLabel="Deliver to CUHK hall lobby · Canteen"
      searchProducts={searchProducts}
      search={search}
      onSearchChange={setSearch}
      onSearchSelect={(item) => {
        const m = item.id.match(/^canteen-dish:([^:]+):/);
        if (m?.[1]) window.location.href = `/canteen/${m[1]}`;
      }}
      searchPlaceholder="Search food item"
      sidebar={sidebar}
      mobileSidebarTitle="Canteens"
      cartChannel="canteen"
    >
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ED1C24]">
          CUHK canteens
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">
          GraceRun Canteen
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
          Your canteen favorites, delivered to your dorm lobby. Flat delivery
          HK$10 · 10% college canteen discount when your runner matches. Search
          dishes above.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSort(opt.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                sort === opt.id
                  ? "border-[#ED1C24] bg-[#ED1C24]/10 text-[#ED1C24]"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {q ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">
            Dishes matching “{search.trim()}”
          </p>
          {dishResults.length === 0 ? (
            <p className="text-sm text-gray-500">No dishes match that search.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dishResults.slice(0, 60).map((d) => {
                const open = isCanteenOpenByConfig(d.restaurantId);
                return (
                  <Link
                    key={`${d.restaurantId}:${d.id}`}
                    href={`/canteen/${d.restaurantId}`}
                    className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition hover:border-[#ED1C24]/40"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-50">
                      {d.image ? (
                        <Image
                          src={d.image}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{d.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {d.restaurantName} · HK${d.price}
                      </p>
                      {!open ? (
                        <p className="mt-1 text-[11px] font-semibold text-orange-700">
                          Closed now
                        </p>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {venues.map((r) => {
            const college = r.collegeId ? getCollege(r.collegeId) : undefined;
            const open = r.menuReady ? isCanteenOpenByConfig(r.id) : false;
            return (
              <Link
                key={r.id}
                href={`/canteen/${r.id}`}
                className="block rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-[#ED1C24]/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {r.logoSrc ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-50 ring-1 ring-gray-100">
                        <Image
                          src={r.logoSrc}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-contain p-1"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-bold text-gray-900">
                          {r.name}
                        </p>
                        {college ? (
                          <span className="rounded-md bg-[#ED1C24]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#ED1C24]">
                            {college.shortName} · 10% off
                          </span>
                        ) : null}
                        {!r.menuReady ? (
                          <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
                            Soon
                          </span>
                        ) : (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                              open
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-orange-50 text-orange-700"
                            }`}
                          >
                            {open ? "Open" : "Closed"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">
                        {r.blurb}
                      </p>
                      {r.location ? (
                        <p className="mt-1.5 text-xs text-gray-500">
                          {r.location}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-gray-500">
                        {r.hoursLabel} · HK${r.deliveryFee} delivery
                      </p>
                      {r.menuReady && !open ? (
                        <p className="mt-1 text-xs font-medium text-orange-700">
                          {closedBannerText(r.shortName, r.id)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-lg bg-[#ED1C24] px-3 py-1.5 text-xs font-semibold text-white">
                    {r.menuReady ? "Menu" : "Soon"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </ShopLayout>
  );
}
