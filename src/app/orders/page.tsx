"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { OrderChatPanel } from "@/components/OrderChatPanel";
import { PageWallpaper } from "@/components/PageWallpaper";
import { RequireAuth } from "@/components/RequireAuth";
import { BG_ORDERS } from "@/data/page-backgrounds";
import { formatDeliveryAddress } from "@/data/cuhk-locations";
import { useCart } from "@/context/CartContext";
import { useUser, getUserAccountId } from "@/context/UserContext";
import { isChatActive } from "@/lib/constants";
import { getMenuItemById } from "@/lib/menu";
import { cancelOrder, fetchOrdersByIds, getOrderHistoryIds } from "@/lib/orders";
import { ORDER_STATUS_LABELS, type Order } from "@/lib/types";

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useUser();
  const { addItem } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function load() {
    const ids = getOrderHistoryIds();
    const results = await fetchOrdersByIds(ids);
    setOrders(results);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCancel(order: Order) {
    if (!user) return;
    setCancellingId(order.id);
    try {
      await cancelOrder(order.id, getUserAccountId(user));
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not cancel");
    } finally {
      setCancellingId(null);
    }
  }

  function handleReorder(order: Order) {
    let added = 0;
    for (const line of order.items) {
      const item = getMenuItemById(line.itemId);
      if (item) {
        for (let i = 0; i < line.quantity; i++) addItem(item);
        added += line.quantity;
      }
    }
    if (added === 0) {
      alert("Some items are no longer available.");
      return;
    }
    router.push("/cart");
  }

  return (
    <RequireAuth>
      <AppShell>
        <PageWallpaper src={BG_ORDERS} alt="" overlayClassName="bg-lakers-navy/60">
          <AppHeader title="Order History" />

          <main className="mx-auto max-w-[480px] px-4 py-4">
            {loading ? (
              <p className="text-sm text-lakers-gold">Loading orders…</p>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-gray-600">No orders yet.</p>
                <Link href="/home" className="mt-3 inline-block text-fusion-red underline">
                  Place your first order
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {orders.map((order) => (
                  <li
                    key={order.id}
                    className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    <Link href={`/track?orderId=${order.id}`}>
                      <div className="flex justify-between">
                        <p className="font-bold text-gray-900">{order.id}</p>
                        <span className="rounded-full bg-lakers-gold/20 px-2 py-0.5 text-xs font-medium text-lakers-purple">
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDeliveryAddress(
                          order.college,
                          order.hall,
                          order.roomNumber,
                        )}
                      </p>
                      <p className="mt-2 text-sm font-semibold">${order.total}</p>
                    </Link>

                    <div className="mt-3 flex gap-2">
                      {order.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => handleCancel(order)}
                          disabled={cancellingId === order.id}
                          className="flex-1 rounded-xl border border-red-200 py-2 text-xs font-semibold text-red-600"
                        >
                          {cancellingId === order.id ? "Cancelling…" : "Cancel"}
                        </button>
                      )}
                      {(order.status === "delivered" || order.status === "cancelled") && (
                        <button
                          type="button"
                          onClick={() => handleReorder(order)}
                          className="flex-1 rounded-xl bg-fusion-red py-2 text-xs font-semibold text-white"
                        >
                          Order Again
                        </button>
                      )}
                    </div>

                    {isChatActive(order.status) && (
                      <OrderChatPanel order={order} compact />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </main>
        </PageWallpaper>
      </AppShell>
    </RequireAuth>
  );
}
