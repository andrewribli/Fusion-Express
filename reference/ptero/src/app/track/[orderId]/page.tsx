"use client";

import { use } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import {
  DiscountLine,
  DiscountReceivedBanner,
} from "@/components/CollegeDiscount";
import { OrderProgressBar } from "@/components/OrderProgressBar";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { CAMPUS } from "@/config/campus";
import { getRestaurant } from "@/config/canteen/restaurants";
import { useAppState } from "@/context/AppState";
import {
  customerAmountDue,
  formatHkd,
  ORDER_STATUS_LABELS,
  resolveOrderChannel,
} from "@/lib/types";

export default function TrackOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const { orders } = useAppState();
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <AppShell>
        <PrototypeBanner />
        <AppHeader showBack backHref="/orders" title="Track" />
        <main className="mx-auto max-w-[480px] px-4 py-10 text-center">
          <p className="text-sm text-gray-600">Order not found in this browser.</p>
          <Link href="/orders" className="mt-3 inline-block text-sm font-semibold text-[#ED1C24]">
            View orders
          </Link>
        </main>
      </AppShell>
    );
  }

  const due = customerAmountDue(order);
  const canPay = order.status === "delivered";
  const channel = resolveOrderChannel(order);
  const restaurant = order.canteenRestaurantId
    ? getRestaurant(order.canteenRestaurantId)
    : undefined;
  const foodLabel =
    channel === "canteen"
      ? restaurant?.shortName ?? "Canteen"
      : CAMPUS.supermarket;

  return (
    <AppShell>
      <PrototypeBanner />
      <AppHeader showBack backHref="/orders" title="Track order" />
      <main className="mx-auto max-w-[480px] px-4 py-4 pb-28">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {order.id} · {channel === "canteen" ? "canteen" : CAMPUS.supermarket} ·{" "}
            {order.campus}
          </p>
          <h1 className="mt-1 text-lg font-bold text-gray-900">
            {ORDER_STATUS_LABELS[order.status]}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {order.compound} → {order.hall}
          </p>
          <p className="text-xs text-gray-500">Lobby: {order.lobby}</p>
          <div className="mt-4">
            <OrderProgressBar status={order.status} />
          </div>
        </div>

        {order.runnerName && (
          <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4 text-sm shadow-sm">
            <p className="font-semibold">Runner: {order.runnerName}</p>
            {order.runnerPhone && (
              <p className="mt-1 text-xs text-gray-500">Runner phone: {order.runnerPhone}</p>
            )}
          </div>
        )}

        <div className="mt-3">
          <DiscountReceivedBanner
            discountApplied={order.discountApplied}
            runnerCollege={order.runnerCollege}
          />
        </div>

        <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Items from {foodLabel}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {order.items.map((item) => (
              <li key={item.itemId} className="flex justify-between">
                <span>
                  {item.quantity}× {item.name}
                </span>
                <span>HK${(item.price * item.quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between">
              <span>{channel === "canteen" ? "Food subtotal" : "Estimate / receipt"}</span>
              <span>{formatHkd(order.receiptTotal ?? order.subtotal)}</span>
            </div>
            <DiscountLine
              discountApplied={order.discountApplied}
              discountAmount={order.discountAmount}
            />
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{formatHkd(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Amount due</span>
              <span className="text-[#ED1C24]">{formatHkd(due)}</span>
            </div>
          </div>
        </div>

        {canPay ? (
          <Link
            href={`/pay/${order.id}`}
            className="mt-4 flex w-full items-center justify-center rounded-xl bg-fusion-red py-4 text-base font-semibold text-white"
          >
            Pay {formatHkd(due)} via Airwallex
          </Link>
        ) : order.status === "paid" ? (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800">
            Paid via Airwallex
          </p>
        ) : (
          <p className="mt-4 text-center text-xs text-gray-500">
            Pay after the runner delivers to {order.lobby}
            {order.discountApplied ? " · college discount applied" : ""}.
          </p>
        )}
      </main>
    </AppShell>
  );
}
