"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CanteenShopLayout } from "@/ptero/components/CanteenShopLayout";
import { CollegeDiscountBanner } from "@/ptero/components/CollegeDiscount";
import {
  getCanteenMenu,
  groupMenuByCategory,
  groupMenuByMealPeriod,
  type CanteenMenuItem,
} from "@/ptero/config/canteen/menus";
import { getRestaurant, RESTAURANTS } from "@/ptero/config/canteen/restaurants";
import { toCartMenuItem } from "@/ptero/lib/canteen/cart";
import { useCart } from "@/ptero/context/CartContext";
import { formatHkd } from "@/ptero/lib/types";

function MenuRow({
  restaurantId,
  item,
}: {
  restaurantId: string;
  item: CanteenMenuItem;
}) {
  const { addItem, items, setQuantity } = useCart();
  const cartId = `canteen:${restaurantId}:${item.id}`;
  const qty = items.find((c) => c.item.id === cartId)?.quantity ?? 0;

  return (
    <li className="flex items-start justify-between gap-3 border-b border-gray-50 py-3 last:border-0">
      <div className="flex min-w-0 gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 shrink-0 rounded-lg object-cover bg-gray-100"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{item.name}</p>
          {item.description ? (
            <p className="mt-0.5 text-xs text-gray-500">{item.description}</p>
          ) : null}
          <p className="mt-1 text-sm font-bold text-gray-900">{formatHkd(item.price)}</p>
        </div>
      </div>
      {qty > 0 ? (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setQuantity(cartId, qty - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 font-bold"
          >
            −
          </button>
          <span className="min-w-5 text-center text-sm font-semibold">{qty}</span>
          <button
            type="button"
            onClick={() => setQuantity(cartId, qty + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 font-bold"
          >
            +
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => addItem(toCartMenuItem(restaurantId, item))}
          className="rounded-xl bg-[#ED1C24] px-3 py-2 text-xs font-bold text-white"
        >
          Add
        </button>
      )}
    </li>
  );
}

export default function CanteenDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const restaurant = getRestaurant(slug);
  const [search, setSearch] = useState("");
  const blocked = Boolean(restaurant && !restaurant.menuReady);

  useEffect(() => {
    if (blocked) router.replace("/cityu/canteen");
  }, [blocked, router]);

  const menu = useMemo(() => {
    if (!restaurant || !restaurant.menuReady) return [];
    const all = getCanteenMenu(restaurant.id);
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        (i.description?.toLowerCase().includes(q) ?? false),
    );
  }, [restaurant, search]);

  const sidebar = (
    <nav className="px-2 py-2">
      <Link
        href="/cityu/canteen"
        className="mb-1 block rounded-lg px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50"
      >
        ← All canteens
      </Link>
      {RESTAURANTS.map((r) =>
        r.menuReady ? (
          <Link
            key={r.id}
            href={`/cityu/canteen/${r.id}`}
            className={`block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-gray-50 ${
              r.id === slug ? "bg-red-50 text-[#ED1C24]" : "text-gray-800"
            }`}
          >
            {r.shortName}
          </Link>
        ) : (
          <div
            key={r.id}
            aria-disabled="true"
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400"
          >
            {r.shortName}
            <span className="ml-2 text-[10px] font-semibold uppercase text-gray-400">
              Soon
            </span>
          </div>
        ),
      )}
    </nav>
  );

  if (!restaurant || blocked) {
    return (
      <CanteenShopLayout search={search} onSearchChange={setSearch} sidebar={sidebar}>
        <p className="text-sm text-gray-600">
          {blocked ? "This canteen is coming soon." : "Canteen not found."}
        </p>
        <Link href="/cityu/canteen" className="mt-2 inline-block text-sm font-semibold text-[#ED1C24]">
          Back to CityU Canteens
        </Link>
      </CanteenShopLayout>
    );
  }

  const periodGroups = restaurant.useMealPeriods
    ? groupMenuByMealPeriod(menu)
    : [];
  const categoryGroups = !restaurant.useMealPeriods
    ? groupMenuByCategory(menu)
    : [];

  return (
    <CanteenShopLayout
      deliveryLabel={`Deliver to CityU hall lobby · ${restaurant.shortName}`}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={`Search ${restaurant.shortName}`}
      sidebar={sidebar}
    >
      <div className="mb-4 flex items-start gap-3">
        {restaurant.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.logo}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-xl object-contain bg-white ring-1 ring-gray-100"
          />
        ) : null}
        <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ED1C24]">
          {restaurant.cuisine}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-gray-900">
          {restaurant.name}
        </h1>
        <p className="mt-1 text-sm text-gray-600">{restaurant.blurb}</p>
        <p className="mt-2 text-xs text-gray-500">
          {restaurant.location} · {restaurant.hoursLabel} · HK$
          {restaurant.deliveryFee} delivery
        </p>
        </div>
      </div>

      <div className="mb-4">
        <CollegeDiscountBanner collegeId={restaurant.collegeId} />
      </div>

      {restaurant.useMealPeriods
        ? periodGroups.map((group) => (
            <section
              key={group.period}
              className="mb-4 rounded-2xl border border-gray-100 bg-white px-4 py-2 shadow-sm"
            >
              <h2 className="border-b border-gray-50 py-2 text-sm font-bold text-gray-900">
                {group.label}
              </h2>
              <ul>
                {group.items.map((item) => (
                  <MenuRow
                    key={`${group.period}-${item.id}`}
                    restaurantId={restaurant.id}
                    item={item}
                  />
                ))}
              </ul>
            </section>
          ))
        : categoryGroups.map((group) => (
            <section
              key={group.category}
              className="mb-4 rounded-2xl border border-gray-100 bg-white px-4 py-2 shadow-sm"
            >
              <h2 className="border-b border-gray-50 py-2 text-sm font-bold text-gray-900">
                {group.category}
              </h2>
              <ul>
                {group.items.map((item) => (
                  <MenuRow
                    key={item.id}
                    restaurantId={restaurant.id}
                    item={item}
                  />
                ))}
              </ul>
            </section>
          ))}

      {menu.length === 0 ? (
        <p className="text-sm text-gray-500">No items match your search.</p>
      ) : null}
    </CanteenShopLayout>
  );
}
