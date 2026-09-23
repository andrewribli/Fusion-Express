"use client";

import Link from "next/link";
import { AppHeader } from "@/ptero/components/AppHeader";
import { AppShell } from "@/ptero/components/AppShell";
import { OrderProgressBar } from "@/ptero/components/OrderProgressBar";
import { PrototypeBanner } from "@/ptero/components/PrototypeBanner";
import { useAppState, useUser } from "@/ptero/context/AppState";
import { ORDER_STATUS_LABELS } from "@/ptero/lib/types";

export default function OrdersPage() {
  const { user } = useUser();
  const { orders } = useAppState();
  const mine = user
    ? orders.filter((o) => o.customerId === user.uid)
    : orders;

  return (
    <AppShell>
      <PrototypeBanner />
      <AppHeader showBack backHref="/cityu" title="Orders" />
      <main className="mx-auto max-w-[480px] px-4 py-4 pb-28">
        <h1 className="text-lg font-bold">Your orders</h1>
        <p className="mt-1 text-xs text-gray-500">
          Stored in this browser for the CityU prototype (campus field: cityu).
        </p>
        {mine.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-sm text-gray-600">No orders yet.</p>
            <Link href="/cityu" className="mt-3 inline-block text-sm font-semibold text-[#ED1C24]">
              Shop Taste
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {mine.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/cityu/track/${order.id}`}
                  className="block rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold">{order.id}</p>
                      <p className="text-xs text-gray-500">
                        {order.hall} · {order.lobby}
                      </p>
                    </div>
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-[#ED1C24]">
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <div className="mt-3">
                    <OrderProgressBar status={order.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
