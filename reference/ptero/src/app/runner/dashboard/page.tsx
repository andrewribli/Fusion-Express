"use client";

import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { CollegeDiscountRunnerBadge } from "@/components/CollegeDiscountRunnerBadge";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { CAMPUS } from "@/config/campus";
import { collegeLabel, getCollege } from "@/config/canteen/colleges";
import { getRestaurant } from "@/config/canteen/restaurants";
import { useAppState, useUser } from "@/context/AppState";
import { formatHkd, resolveOrderChannel } from "@/lib/types";

export default function RunnerDashboardPage() {
  const { user, canRunnerMode } = useUser();
  const { orders, acceptOrder } = useAppState();
  const available = orders.filter((o) => o.status === "pending" && o.campus === CAMPUS.id);

  if (!canRunnerMode) {
    return (
      <AppShell>
        <PrototypeBanner />
        <AppHeader showBack title="Available" />
        <main className="mx-auto max-w-[480px] px-4 py-8 text-center">
          <p className="text-sm text-gray-600">Register as a runner to see open CityU orders.</p>
          <Link href="/runner" className="mt-3 inline-block text-sm font-semibold text-[#ED1C24]">
            Become a runner
          </Link>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PrototypeBanner />
      <AppHeader title="Available orders" />
      <main className="mx-auto max-w-[480px] px-4 py-4 pb-28">
        <p className="text-xs text-gray-500">
          Signed in as {user?.name} · {user?.phone}
          {user?.college ? ` · ${collegeLabel(user.college)}` : ""}
        </p>
        {available.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-sm text-gray-600">No open CityU orders right now.</p>
            <p className="mt-1 text-xs text-gray-400">
              Place a guest order in another tab, then come back here.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {available.map((order) => {
              const channel = resolveOrderChannel(order);
              const restaurant = order.canteenRestaurantId
                ? getRestaurant(order.canteenRestaurantId)
                : undefined;
              const matchCollege =
                user?.college &&
                order.canteenCollege &&
                user.college === order.canteenCollege;
              return (
                <li
                  key={order.id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold">{order.id}</p>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        channel === "canteen"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-[#ED1C24]"
                      }`}
                    >
                      {channel === "canteen" ? "Canteen" : CAMPUS.supermarket}
                    </span>
                    {matchCollege ? (
                      <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                        10% discount unlock
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-500">
                    {order.compound} → {order.hall} · {order.lobby}
                  </p>
                  {restaurant ? (
                    <p className="mt-1 text-xs font-medium text-gray-700">
                      Pickup: {restaurant.pickupLabel}
                      {order.canteenCollege
                        ? ` · ${getCollege(order.canteenCollege)?.shortName}`
                        : ""}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">
                      Shopping at {CAMPUS.supermarket}, {CAMPUS.supermarketLocation}
                    </p>
                  )}
                  <p className="mt-1 text-sm">
                    {order.items.reduce((n, i) => n + i.quantity, 0)} items · estimate{" "}
                    {formatHkd(order.subtotal)}
                  </p>
                  <ul className="mt-2 text-xs text-gray-600">
                    {order.items.map((item) => (
                      <li key={item.itemId}>
                        {item.quantity}× {item.name}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    <CollegeDiscountRunnerBadge
                      order={order}
                      runnerCollege={user?.college}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => acceptOrder(order.id)}
                    className="mt-3 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-white"
                  >
                    Accept run
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
