"use client";

import Link from "next/link";
import { CustomerPartyName } from "@/components/DeliveryIdentity";
import { formatDeliveryAddress } from "@/data/cuhk-locations";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import type { Order } from "@/lib/types";

const HISTORY_STATUSES = new Set<Order["status"]>([
  "delivered",
  "paid",
  "runner_paid",
  "completed",
  "customer_paid",
]);

function historyDate(order: Order): Date {
  return order.deliveredAt ?? order.customerPaidAt ?? order.runnerPaidAt ?? order.updatedAt;
}

function formatHistoryDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-HK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function chatHref(order: Order): string {
  return order.campus === "cityu" ? `/cityu/chat/${order.id}` : `/chat/${order.id}`;
}

/**
 * Delivered and later runner jobs. Shared by CityU and CUHK runner mode.
 * The title is the customer name or pseudonym, never the Firestore id.
 */
export function RunnerOrderHistory({ orders }: { orders: Order[] }) {
  const history = orders
    .filter((order) => HISTORY_STATUSES.has(order.status))
    .sort((a, b) => historyDate(b).getTime() - historyDate(a).getTime());

  if (history.length === 0) {
    return (
      <section className="mt-4">
        <h2 className="text-sm font-semibold text-gray-900">Order history</h2>
        <div className="mt-3 rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-sm text-gray-500">No delivered orders yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-4">
      <h2 className="text-sm font-semibold text-gray-900">Order history</h2>
      <p className="mt-1 text-xs text-gray-500">
        Delivered orders, and anything paid or completed after that.
      </p>
      <ul className="mt-3 space-y-3">
        {history.map((order) => {
          const place =
            formatDeliveryAddress(order.college, order.hall) || "Hall not set";
          const label = ORDER_STATUS_LABELS[order.status];
          return (
            <li key={order.id}>
              <Link
                href={chatHref(order)}
                className="block rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-bold text-gray-900">
                    <CustomerPartyName orderId={order.id} />
                  </p>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                    {label}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-gray-600">{place}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {formatHistoryDate(historyDate(order))}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
