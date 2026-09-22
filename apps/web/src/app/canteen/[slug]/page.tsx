"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CanteenChrome } from "@/components/canteen/CanteenChrome";
import { CanteenMenuCard } from "@/components/canteen/CanteenMenuCard";
import { CollegeDiscountBanner } from "@/components/canteen/CollegeDiscountBanner";
import {
  CATEGORY_LABELS,
  MENU as BF_MENU,
  type MenuCategory,
} from "@/data/canteen/bf-menu";
import { getRestaurant } from "@/data/canteen/restaurants";
import {
  UC_MEAL_PERIODS,
  groupByCategory,
  ucItemsForPeriod,
  type MealPeriod,
} from "@/data/canteen/uc-menu";
import {
  getCurrentUcPeriod,
  getNextUcOpeningLabel,
  isBfCanteenOpen,
} from "@/lib/canteen/hours";
import { useCart } from "@/context/CartContext";

const BF_FILTERS: Array<"all" | MenuCategory> = [
  "all",
  "mains",
  "snacks",
  "drinks",
  "dessert",
];

export default function CanteenSlugPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "");
  const restaurant = getRestaurant(slug);
  const { itemCount, subtotal } = useCart();

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] text-white">
        <CanteenChrome />
        <main className="mx-auto max-w-lg px-4 py-8 text-center">
          <p className="text-sm text-zinc-400">Canteen not found.</p>
          <Link href="/canteen" className="mt-4 inline-block text-[#ED1C24]">
            Back to canteens
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] pb-28 text-white">
      <CanteenChrome subtitle={restaurant.shortName} />
      <main className="mx-auto max-w-lg px-4 pt-5">
        {restaurant.id === "benjamin-franklin" ? (
          <BfMenu />
        ) : restaurant.id === "uc-canteen" ? (
          <UcMenu />
        ) : (
          <StubMenu
            name={restaurant.name}
            blurb={restaurant.blurb}
            restaurantId={restaurant.id}
          />
        )}
      </main>

      {itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0c0c0c]/95 p-3 backdrop-blur">
          <div className="mx-auto max-w-lg">
            <Link
              href="/cart"
              className="flex w-full items-center justify-between rounded-xl bg-[#ED1C24] px-4 py-3.5 text-sm font-semibold text-white"
            >
              <span>
                View cart · {itemCount} item{itemCount === 1 ? "" : "s"}
              </span>
              <span>HK${subtotal.toFixed(subtotal % 1 === 0 ? 0 : 1)}</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
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
      <h1 className="text-xl font-bold">{name}</h1>
      <p className="mt-1 text-sm text-zinc-400">{blurb}</p>
      <div className="mt-5">
        <CollegeDiscountBanner restaurantId={restaurantId} />
      </div>
      <div className="mt-6 rounded-xl border border-white/10 bg-[#161616] px-4 py-8 text-center">
        <p className="text-sm text-zinc-400">
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

function BfMenu() {
  const [filter, setFilter] = useState<"all" | MenuCategory>("all");
  const open = isBfCanteenOpen();
  const items = useMemo(() => {
    if (filter === "all") return BF_MENU;
    return BF_MENU.filter((i) => i.category === filter);
  }, [filter]);

  return (
    <>
      <h1 className="text-xl font-bold">Benjamin Franklin Canteen</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Campus favorites · HK$10 flat delivery to your lobby
      </p>
      <div
        className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
          open
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            : "border-amber-500/30 bg-amber-500/10 text-amber-100"
        }`}
      >
        {open
          ? "Open now · 7:30 AM – 9:00 PM (HKT)"
          : "Closed · Opens 7:30 AM – 9:00 PM (HKT)"}
      </div>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {BF_FILTERS.map((id) => {
          const label = id === "all" ? "All" : CATEGORY_LABELS[id];
          const active = filter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-[#ED1C24] text-white"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <section className="mt-4 space-y-3" aria-label="Canteen menu">
        {items.map((item) => (
          <CanteenMenuCard
            key={item.id}
            kind="bf"
            item={item}
            restaurantId="benjamin-franklin"
          />
        ))}
      </section>
    </>
  );
}

function UcMenu() {
  const [period, setPeriod] = useState<MealPeriod | null>(null);
  const [nextOpen, setNextOpen] = useState("9:00 AM");

  useEffect(() => {
    const tick = () => {
      setPeriod(getCurrentUcPeriod());
      setNextOpen(getNextUcOpeningLabel());
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const groups = useMemo(() => {
    return groupByCategory(ucItemsForPeriod(period));
  }, [period]);

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1010] via-[#121212] to-[#0d0d0d] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ED1C24]">
          United College
        </p>
        <h1 className="mt-1 text-2xl font-bold">UC Canteen</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Menu changes by time of day. Flat HK$10 delivery to your lobby.
        </p>
      </div>

      <div className="mt-4">
        <CollegeDiscountBanner restaurantId="uc-canteen" />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(UC_MEAL_PERIODS) as MealPeriod[]).map((id) => {
          const slot = UC_MEAL_PERIODS[id];
          const active = period === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPeriod(id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-left text-xs ${
                active
                  ? "bg-[#ED1C24] text-white"
                  : "bg-white/5 text-zinc-400"
              }`}
            >
              <p className="font-semibold">{slot.label}</p>
              <p className={active ? "text-white/80" : "text-zinc-500"}>
                {slot.start} – {slot.end}
              </p>
            </button>
          );
        })}
      </div>

      {!period ? (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-6 text-center">
          <p className="text-base font-semibold text-amber-100">
            UC Canteen is currently closed. Come back at {nextOpen}.
          </p>
          <p className="mt-2 text-sm text-amber-200/70">
            Open periods: Breakfast 9:00–11:00 · Lunch 11:00–2:30 · Tea
            2:30–5:00 · Dinner 5:00–8:30 (HKT)
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          {groups.map((group) => (
            <section key={group.category}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                {group.category}
              </h2>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <CanteenMenuCard
                    key={item.id}
                    kind="uc"
                    item={item}
                    restaurantId="uc-canteen"
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
