"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { OrderChatPanel } from "@/components/OrderChatPanel";
import { RequireAdmin } from "@/components/RequireAdmin";
import { fetchActiveOrders } from "@/lib/orders";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import type { Order } from "@/lib/types";

export default function AdminOrderChatsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchActiveOrders();
        if (cancelled) return;
        const chatty = rows
          .filter((o) => o.status !== "pending" && o.status !== "cancelled")
          .sort(
            (a, b) =>
              (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0),
          );
        setOrders(chatty);
        if (chatty[0]) setSelectedId(chatty[0].id);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load orders");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => orders.find((o) => o.id === selectedId) ?? null,
    [orders, selectedId],
  );

  return (
    <RequireAdmin>
      <AppShell hideNav>
        <LakersWallpaper>
          <AppHeader showBack backHref="/admin/users" title="Order Chats" />
          <main className="mx-auto max-w-5xl px-4 py-6">
            <div className="mb-4 flex flex-wrap gap-3 text-sm">
              <Link href="/admin/support" className="font-medium text-[#ED1C24] underline">
                Support inbox
              </Link>
              <Link href="/admin/users" className="font-medium text-[#ED1C24] underline">
                Users
              </Link>
              <Link href="/admin/messaging" className="font-medium text-[#ED1C24] underline">
                Broadcasts
              </Link>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Oversee customer ↔ runner chats on active orders. You can read and
              intervene. Customer → admin DMs are under{" "}
              <Link href="/admin/support" className="font-medium text-[#ED1C24] underline">
                Support Chat
              </Link>
              .
            </p>
            {error ? (
              <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                <p className="border-b border-gray-100 px-4 py-3 text-sm font-bold text-gray-900">
                  Active orders
                </p>
                {loading ? (
                  <p className="px-4 py-6 text-sm text-gray-500">Loading…</p>
                ) : orders.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-500">
                    No active accepted orders right now.
                  </p>
                ) : (
                  <ul className="max-h-[70vh] overflow-y-auto">
                    {orders.map((order) => (
                      <li key={order.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(order.id)}
                          className={`w-full border-b border-gray-50 px-4 py-3 text-left hover:bg-red-50 ${
                            selectedId === order.id ? "bg-red-50" : ""
                          }`}
                        >
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {order.id}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {ORDER_STATUS_LABELS[order.status]} ·{" "}
                            {order.customerName || "Customer"}
                            {order.runnerName ? ` · ${order.runnerName}` : ""}
                          </p>
                          {order.runnerStudentId ? (
                            <p className="mt-0.5 text-[10px] text-gray-400">
                              Runner ID {order.runnerStudentId}
                            </p>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>
              <section className="min-h-[24rem] rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                {!selected ? (
                  <p className="m-auto text-sm text-gray-500">
                    Select an order to open its chat.
                  </p>
                ) : (
                  <div>
                    <p className="mb-1 text-sm font-bold text-gray-900">
                      {selected.id}
                    </p>
                    <p className="mb-3 text-xs text-gray-500">
                      {selected.hall} · {ORDER_STATUS_LABELS[selected.status]}
                      {selected.runnerName
                        ? ` · Runner ${selected.runnerName}`
                        : ""}
                      {selected.runnerStudentId
                        ? ` (${selected.runnerStudentId})`
                        : ""}
                    </p>
                    <OrderChatPanel order={selected} />
                  </div>
                )}
              </section>
            </div>
          </main>
        </LakersWallpaper>
      </AppShell>
    </RequireAdmin>
  );
}
