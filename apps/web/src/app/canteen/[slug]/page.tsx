"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AccountMenu } from "@/components/AccountMenu";
import { AppLogo } from "@/components/AppLogo";
import { useCart } from "@/context/CartContext";
import {
  currentUcMealZone,
  getCanteenMenu,
  getRestaurant,
  toCartMenuItemFromCanteen,
  UC_MEAL_ZONES,
  type CanteenMealZone,
  type CanteenMenuItem,
} from "@fusion-express/shared/canteen";

function MenuRow({
  item,
  restaurantId,
}: {
  item: CanteenMenuItem;
  restaurantId: string;
}) {
  const { addItem, items, setQuantity } = useCart();
  const cartId = `canteen:${restaurantId}:${item.id}`;
  const qty = items.find((c) => c.item.id === cartId)?.quantity ?? 0;

  return (
    <li className="flex items-start justify-between gap-3 border-b border-white/5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">
          {item.name}
          {item.nameZh ? (
            <span className="ml-1 font-normal text-zinc-400">({item.nameZh})</span>
          ) : null}
        </p>
        {item.description ? (
          <p className="mt-0.5 text-xs text-zinc-500">{item.description}</p>
        ) : null}
        <p className="mt-1 text-sm font-bold text-emerald-400">
          HK${item.price.toFixed(0)}
        </p>
      </div>
      {qty > 0 ? (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="h-8 w-8 rounded-full bg-white/10 text-white"
            onClick={() => setQuantity(cartId, qty - 1)}
          >
            −
          </button>
          <span className="w-5 text-center text-sm font-bold">{qty}</span>
          <button
            type="button"
            className="h-8 w-8 rounded-full bg-emerald-500 text-white"
            onClick={() => setQuantity(cartId, qty + 1)}
          >
            +
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="shrink-0 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white"
          onClick={() => addItem(toCartMenuItemFromCanteen(item, restaurantId))}
        >
          Add
        </button>
      )}
    </li>
  );
}

export default function CanteenMenuPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const restaurant = getRestaurant(slug);
  const { itemCount } = useCart();
  const menu = useMemo(() => getCanteenMenu(slug), [slug]);
  const isUc = slug === "uc-canteen";
  const [zone, setZone] = useState<CanteenMealZone | "all">(
    () => currentUcMealZone() ?? "all",
  );

  const visible = useMemo(() => {
    if (!isUc || zone === "all") return menu;
    return menu.filter(
      (item) => !item.timeZones || item.timeZones.includes(zone),
    );
  }, [isUc, menu, zone]);

  const categories = useMemo(() => {
    const order: string[] = [];
    for (const item of visible) {
      if (!order.includes(item.category)) order.push(item.category);
    }
    return order;
  }, [visible]);

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] px-4 py-8 text-center text-white">
        <p className="text-sm text-zinc-400">Canteen not found.</p>
        <Link href="/canteen" className="mt-4 inline-block text-[#ED1C24]">
          Back to canteens
        </Link>
      </div>
    );
  }

  if (!restaurant.menuReady) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] px-4 py-8 text-center text-white">
        <p className="text-sm text-zinc-400">{restaurant.name} is coming soon.</p>
        <Link href="/canteen" className="mt-4 inline-block text-emerald-400">
          Back to canteens
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0c0c0c]/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <Link href="/" className="flex items-center gap-2" aria-label="GraceRun home">
              <AppLogo size={36} className="h-9 w-9" />
              <p className="truncate text-sm font-bold text-white">GraceRun</p>
            </Link>
            <Link
              href="/canteen"
              className="mt-1 inline-block text-xs text-zinc-400 hover:text-white"
            >
              ← Canteens
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/canteen/cart"
              className="relative rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/5"
            >
              Cart{itemCount > 0 ? ` (${itemCount})` : ""}
            </Link>
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-28 pt-5">
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        <p className="mt-1 text-sm text-zinc-400">{restaurant.blurb}</p>
        <p className="mt-1 text-xs text-zinc-500">{restaurant.hoursLabel}</p>

        {isUc ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setZone("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                zone === "all"
                  ? "bg-emerald-500 text-white"
                  : "bg-white/10 text-zinc-300"
              }`}
            >
              All
            </button>
            {(Object.keys(UC_MEAL_ZONES) as CanteenMealZone[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setZone(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  zone === id
                    ? "bg-emerald-500 text-white"
                    : "bg-white/10 text-zinc-300"
                }`}
              >
                {UC_MEAL_ZONES[id].label}
              </button>
            ))}
          </div>
        ) : null}

        {categories.map((cat) => (
          <section key={cat} className="mt-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-400">
              {cat}
            </h2>
            <ul>
              {visible
                .filter((item) => item.category === cat)
                .map((item) => (
                  <MenuRow key={item.id} item={item} restaurantId={slug} />
                ))}
            </ul>
          </section>
        ))}
      </main>

      {itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0c0c0c]/95 p-4 backdrop-blur">
          <Link
            href="/canteen/checkout"
            className="mx-auto flex max-w-lg items-center justify-center rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white"
          >
            Checkout canteen order ({itemCount})
          </Link>
        </div>
      ) : null}
    </div>
  );
}
