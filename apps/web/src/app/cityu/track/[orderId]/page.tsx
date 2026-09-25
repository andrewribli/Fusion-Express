"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { fetchOrder, orderCampus } from "@/lib/orders";
import { AppHeader } from "@/ptero/components/AppHeader";
import { AppShell } from "@/ptero/components/AppShell";
import {
  DiscountLine,
  DiscountReceivedBanner,
} from "@/ptero/components/CollegeDiscount";
import { OrderProgressBar } from "@/ptero/components/OrderProgressBar";
import { PrototypeBanner } from "@/ptero/components/PrototypeBanner";
import { CAMPUS } from "@/ptero/config/campus";
import { getRestaurant } from "@/ptero/config/canteen/restaurants";
import { useAppState } from "@/ptero/context/AppState";
import { sharedOrderToPtero } from "@/ptero/lib/firestore-orders";
import {
  customerAmountDue,
  formatHkd,
  ORDER_STATUS_LABELS,
  resolveOrderChannel,
} from "@/ptero/lib/types";

export default function TrackOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const { orders } = useAppState();
  const local = orders.find((o) => o.id === orderId);
  const [remote, setRemote] = useState<typeof local | null>(undefined);

  useEffect(() => {
    let cancelled = false;
    void fetchOrder(orderId)
      .then((row) => {
        if (cancelled) return;
        if (!row || orderCampus(row) !== "cityu") {
          setRemote(null);
          return;
        }
        setRemote(sharedOrderToPtero(row));
      })
      .catch(() => {
        if (!cancelled) setRemote(null);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const order = remote === undefined ? local : (remote ?? local);

  if (!order && remote === undefined) {
    return (
      <AppShell>
        <PrototypeBanner />
        <AppHeader showBack backHref="/cityu/orders" title="Track" />
        <main className="mx-auto max-w-[480px] px-4 py-10 text-center text-sm text-gray-500">
          Loading order…
        </main>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell>
        <PrototypeBanner />
        <AppHeader showBack backHref="/cityu/orders" title="Track" />
        <main className="mx-auto max-w-[480px] px-4 py-10 text-center">
          <p className="text-sm text-gray-600">Order not found in this browser.</p>
          <Link href="/cityu/orders" className="mt-3 inline-block text-sm font-semibold text-[#ED1C24]">
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
      <AppHeader showBack backHref="/cityu/orders" title="Track order" />
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

        {order.status === "accepted" ||
        order.status === "purchased" ||
        order.status === "delivered" ||
        order.status === "paid" ? (
          <Link
            href={`/cityu/chat/${order.id}`}
            className="mt-3 flex w-full items-center justify-center rounded-xl border border-[#ED1C24] py-3 text-sm font-bold text-[#ED1C24]"
          >
            Chat with runner
          </Link>
        ) : null}

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
            href={`/cityu/pay/${order.id}`}
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
