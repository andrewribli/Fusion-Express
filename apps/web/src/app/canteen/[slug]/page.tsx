"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ShopLayout } from "@/components/ShopLayout";
import { CollegeDiscountBanner } from "@/components/canteen/CollegeDiscountBanner";
import {
  CATEGORY_LABELS,
  MENU as BF_MENU,
  type MenuCategory,
} from "@/data/canteen/bf-menu";
import {
  getRestaurant,
  RESTAURANTS,
  type Restaurant,
} from "@/data/canteen/restaurants";
import {
  getSimpleMenu,
  isSimpleMenuRestaurant,
  type SimpleMenuItem,
  type SimpleRestaurantId,
} from "@/data/canteen/simple-menu";
import Image from "next/image";
import {
  groupByCategory,
  ucItemsForPeriod,
  type MealPeriod,
} from "@/data/canteen/uc-menu";
import {
  closedBannerText,
  getCurrentUcPeriod,
  getNextUcOpeningLabel,
  isBfCanteenOpen,
  isSimpleCanteenOpen,
} from "@/lib/canteen/hours";
import {
  getCanteenConfig,
  CANTEEN_MEAL_PERIODS,
  orderedMealPeriods,
  getActiveMealPeriod,
} from "@/data/canteen/canteen-config";
import {
  BfItemsGrid,
  PriceSortSelect,
  SimpleItemsGrid,
  UcItemsGrid,
  usePriceSort,
} from "@/components/canteen/CanteenMenuGrid";
import {
  toCartMenuItemFromBf,
  toCartMenuItemFromSimple,
  toCartMenuItemFromUc,
} from "@/lib/canteen/cart";
import type { MenuItem } from "@/lib/types";

const SLUG_ALIASES: Record<string, string> = {
  "united-college": "uc-canteen",
  uc: "uc-canteen",
  "shho-canteen": "sh-ho-canteen",
  "sh-ho": "sh-ho-canteen",
  "paper-coffee": "paper-and-coffee",
  "cu-café": "cu-cafe",
  "sora-zen": "sorazen",
  "sora zen": "sorazen",
  na: "na-canteen",
  "new-asia": "na-canteen",
  "new-asia-canteen": "na-canteen",
};

const BF_FILTERS: Array<"all" | MenuCategory> = [
  "all",
  "mains",
  "snacks",
  "drinks",
  "dessert",
];

export default function CanteenSlugPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const rawSlug = String(params?.slug ?? "");
  const slug = SLUG_ALIASES[rawSlug] ?? rawSlug;
  const restaurant = getRestaurant(slug);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (rawSlug && SLUG_ALIASES[rawSlug]) {
      router.replace(`/canteen/${SLUG_ALIASES[rawSlug]}`);
    }
  }, [rawSlug, router]);

  const searchProducts = useMemo<MenuItem[]>(() => {
    if (!restaurant) return [];
    if (restaurant.id === "benjamin-franklin") {
      return BF_MENU.map((item) => toCartMenuItemFromBf(item, "benjamin-franklin"));
    }
    if (restaurant.id === "uc-canteen") {
      return ucItemsForPeriod(getCurrentUcPeriod()).map((item) =>
        toCartMenuItemFromUc(item, "uc-canteen"),
      );
    }
    if (isSimpleMenuRestaurant(restaurant.id)) {
      const menu = getSimpleMenu(restaurant.id) ?? [];
      return menu.map((item) =>
        toCartMenuItemFromSimple(item, restaurant.id as SimpleRestaurantId),
      );
    }
    return [];
  }, [restaurant]);

  const sidebar = (
    <nav className="px-2 py-2">
      <Link
        href="/canteen"
        className="mb-1 block rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-400 hover:bg-gray-50"
      >
        All canteens
      </Link>
      {RESTAURANTS.map((r) => {
        const active = r.id === restaurant?.id;
        return (
          <Link
            key={r.id}
            href={`/canteen/${r.id}`}
            className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
              active
                ? "bg-[#ED1C24]/10 text-[#ED1C24]"
                : "text-gray-800 hover:bg-gray-50"
            }`}
          >
            {r.shortName}
          </Link>
        );
      })}
    </nav>
  );

  if (!restaurant) {
    return (
      <ShopLayout
        deliveryLabel="Deliver to CUHK hall lobby · Canteen"
        searchProducts={[]}
        search={search}
        onSearchChange={setSearch}
        onSearchSelect={() => undefined}
        searchPlaceholder="Search canteen menu"
        sidebar={sidebar}
        mobileSidebarTitle="Canteens"
        cartChannel="canteen"
      >
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center shadow-sm">
          <p className="text-sm text-gray-600">Canteen not found.</p>
          <Link
            href="/canteen"
            className="mt-4 inline-block text-sm font-semibold text-[#ED1C24]"
          >
            Back to canteens
          </Link>
        </div>
      </ShopLayout>
    );
  }

  return (
    <ShopLayout
      deliveryLabel={`Deliver to CUHK hall lobby · ${restaurant.shortName}`}
      deliveryLogoSrc={restaurant.logoSrc}
      searchProducts={searchProducts}
      search={search}
      onSearchChange={setSearch}
      onSearchSelect={() => undefined}
      searchPlaceholder={`Search ${restaurant.shortName}`}
      sidebar={sidebar}
      mobileSidebarTitle="Canteens"
      cartChannel="canteen"
      hideTrackFab
      orderingEnabled={
        restaurant.id === "benjamin-franklin"
          ? isBfCanteenOpen()
          : restaurant.id === "uc-canteen"
            ? Boolean(getCurrentUcPeriod())
            : isSimpleMenuRestaurant(restaurant.id)
              ? Boolean(isSimpleCanteenOpen(restaurant.id))
              : false
      }
    >
      {restaurant.id === "benjamin-franklin" ? (
        <BfMenu search={search} />
      ) : restaurant.id === "uc-canteen" ? (
        <UcMenu search={search} />
      ) : isSimpleMenuRestaurant(restaurant.id) ? (
        <SimpleMenuView restaurant={restaurant} search={search} />
      ) : (
        <StubMenu
          name={restaurant.name}
          blurb={restaurant.blurb}
          restaurantId={restaurant.id}
        />
      )}
    </ShopLayout>
  );
}

function StubMenu({
  name,
  blurb,
  restaurantId,
}: {
  name: string;
  blurb: string;
  restaurantId: string;
}) {
  return (
    <>
      <h1 className="text-2xl font-extrabold text-gray-900">{name}</h1>
      <p className="mt-1 text-sm text-gray-600">{blurb}</p>
      <div className="mt-5">
        <CollegeDiscountBanner restaurantId={restaurantId} />
      </div>
      <div className="mt-6 rounded-2xl border border-gray-100 bg-white px-4 py-8 text-center shadow-sm">
        <p className="text-sm text-gray-600">
          Full menu coming soon. College discount rules already apply once this
          canteen goes live.
        </p>
        <Link
          href="/canteen/uc-canteen"
          className="mt-4 inline-block text-sm font-semibold text-[#ED1C24]"
        >
          Browse UC Canteen (live menu)
        </Link>
      </div>
    </>
  );
}

function SimpleMenuView({
  restaurant,
  search,
}: {
  restaurant: Restaurant;
  search: string;
}) {
  const restaurantId = restaurant.id as SimpleRestaurantId;
  const [filter, setFilter] = useState<"all" | MenuCategory>("all");
  const [sort, setSort] = usePriceSort();
  const open = isSimpleCanteenOpen(restaurantId) ?? false;
  const cfg = getCanteenConfig(restaurantId);
  const menu = getSimpleMenu(restaurantId) ?? [];

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list: SimpleMenuItem[] =
      filter === "all" ? menu : menu.filter((i) => i.category === filter);
    if (q) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [filter, menu, search]);

  const usedCategories = useMemo(() => {
    const set = new Set(menu.map((i) => i.category));
    return BF_FILTERS.filter((id) => id === "all" || set.has(id));
  }, [menu]);

  return (
    <>
      <div className="flex items-start gap-3">
        {restaurant.logoSrc ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-gray-100">
            <Image
              src={restaurant.logoSrc}
              alt={`${restaurant.name} logo`}
              fill
              sizes="56px"
              className="object-contain p-1"
            />
          </div>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-gray-900">
            {restaurant.name}
          </h1>
          {restaurant.location ? (
            <p className="mt-1 text-sm font-medium text-gray-700">
              {restaurant.location}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-gray-600">{restaurant.blurb}</p>
        </div>
      </div>
      <div
        className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
          open
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {open
          ? `Open now · ${cfg?.hoursLabel ?? restaurant.hoursLabel} (HKT)`
          : closedBannerText(restaurant.name, restaurantId)}
      </div>
      <div className="mt-4">
        <CollegeDiscountBanner restaurantId={restaurantId} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {usedCategories.map((id) => {
            const label = id === "all" ? "All" : CATEGORY_LABELS[id];
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-[#ED1C24] text-white"
                    : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <PriceSortSelect value={sort} onChange={setSort} />
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          No matching items.
        </p>
      ) : (
        <SimpleItemsGrid
          items={items}
          restaurantId={restaurantId}
          orderingEnabled={open}
          sort={sort}
          groupByMealPeriod={Boolean(cfg?.mealPeriods)}
        />
      )}
    </>
  );
}

function BfMenu({ search }: { search: string }) {
  const [filter, setFilter] = useState<"all" | MenuCategory>("all");
  const [sort, setSort] = usePriceSort();
  const open = isBfCanteenOpen();
  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list =
      filter === "all" ? BF_MENU : BF_MENU.filter((i) => i.category === filter);
    if (q) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.description ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [filter, search]);

  return (
    <>
      <h1 className="text-2xl font-extrabold text-gray-900">
        Benjamin Franklin Canteen
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Campus favorites · HK$10 flat delivery to your lobby
      </p>
      <div
        className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
          open
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {open
          ? "Open now · 7:30 AM – 9:00 PM (HKT)"
          : closedBannerText("Benjamin Franklin Canteen", "benjamin-franklin")}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {BF_FILTERS.map((id) => {
            const label = id === "all" ? "All" : CATEGORY_LABELS[id];
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-[#ED1C24] text-white"
                    : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <PriceSortSelect value={sort} onChange={setSort} />
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No matching items.</p>
      ) : (
        <BfItemsGrid items={items} orderingEnabled={open} sort={sort} />
      )}
    </>
  );
}

function UcMenu({ search }: { search: string }) {
  const [period, setPeriod] = useState<MealPeriod | null>(null);
  const [nextOpen, setNextOpen] = useState("7:30 AM");
  const [sort, setSort] = usePriceSort();
  const open = Boolean(period);

  useEffect(() => {
    const tick = () => {
      setPeriod(getCurrentUcPeriod());
      setNextOpen(getNextUcOpeningLabel());
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const activePeriod = period ?? getActiveMealPeriod();
  const periodOrder = orderedMealPeriods(activePeriod);

  const filteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = ucItemsForPeriod(period);
    if (!q) return all;
    return all.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.nameZh ?? "").toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q),
    );
  }, [period, search]);

  const groups = useMemo(
    () => groupByCategory(filteredBySearch),
    [filteredBySearch],
  );

  return (
    <>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ED1C24]">
          United College
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-gray-900">UC Canteen</h1>
        <p className="mt-2 text-sm text-gray-600">
          Menu changes by time of day. Flat HK$10 delivery to your lobby.
        </p>
      </div>

      <div className="mt-4">
        <CollegeDiscountBanner restaurantId="uc-canteen" />
      </div>

      <div
        className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
          open
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {open
          ? `Open now · ${CANTEEN_MEAL_PERIODS[period!].label} (${CANTEEN_MEAL_PERIODS[period!].start} – ${CANTEEN_MEAL_PERIODS[period!].end})`
          : closedBannerText("UC Canteen", "uc-canteen")}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {periodOrder.map((id) => {
            const slot = CANTEEN_MEAL_PERIODS[id];
            const active = period === id;
            return (
              <div
                key={id}
                className={`shrink-0 rounded-xl px-3 py-2 text-left text-xs ${
                  active
                    ? "bg-[#ED1C24] text-white"
                    : "bg-white text-gray-400 ring-1 ring-gray-200 opacity-50"
                }`}
              >
                <p className="font-semibold">{slot.label}</p>
                <p className={active ? "text-white/80" : "text-gray-500"}>
                  {slot.start} – {slot.end}
                </p>
              </div>
            );
          })}
        </div>
        <PriceSortSelect value={sort} onChange={setSort} />
      </div>

      {!open ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
          <p className="text-base font-semibold text-amber-900">
            UC Canteen is currently closed. Opens at {nextOpen}.
          </p>
          <p className="mt-2 text-sm text-amber-800/80">
            Open periods: Breakfast 7:30–11:00 · Lunch 11:00–2:30 · Tea
            2:30–5:00 · Dinner 5:00–7:30 (HKT). Closed Sundays.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          {groups.map((group) => (
            <section key={group.category}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
                {group.category}
              </h2>
              <UcItemsGrid
                items={group.items}
                orderingEnabled={open}
                sort={sort}
              />
            </section>
          ))}
          {groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No matching items.
            </p>
          ) : null}
        </div>
      )}
    </>
  );
}
