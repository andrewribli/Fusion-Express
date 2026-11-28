"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { CancelOrderConfirmModal } from "@/components/CancelOrderConfirmModal";
import { CustomerOrderHeading } from "@/components/CustomerOrderHeading";
import { OrderChatPanel } from "@/components/OrderChatPanel";
import { PageWallpaper } from "@/components/PageWallpaper";
import { RequireAuth } from "@/components/RequireAuth";
import { BG_ORDERS } from "@/data/page-backgrounds";
import { formatDeliveryAddress } from "@/data/cuhk-locations";
import { useCart } from "@/context/CartContext";
import { useUser, getUserAccountId } from "@/context/UserContext";
import { RatingModal } from "@/components/RatingModal";
import { isChatActive } from "@/lib/constants";
import { loadAllProducts } from "@/lib/firestore";
import {
  canCustomerCancelOrder,
  customerAmountDue,
  isCustomerPaymentOpen,
} from "@/lib/order-status";
import { orderHasRating } from "@/lib/ratings";
import { menuItemFromOrderLine } from "@/lib/reorder";
import { notifyOrderCancelled } from "@/lib/notify-email";
import {
  cancelOrder,
  fetchOrdersByCustomer,
} from "@/lib/orders";
import { UnpaidOrdersBanner } from "@/components/UnpaidOrdersBanner";
import { ORDER_STATUS_LABELS, type Order } from "@/lib/types";

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useUser();
  const { addItem } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);

  async function load() {
    if (!user) return;
    setError("");
    try {
      const accountId = getUserAccountId(user);
      const mine = (await fetchOrdersByCustomer(accountId)).filter(
        (order) => order.customerId === accountId,
      );
      setOrders(mine);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  async function handleCancelConfirmed() {
    if (!user || !confirmOrder) return;
    setCancellingId(confirmOrder.id);
    try {
      await cancelOrder(confirmOrder.id, getUserAccountId(user));
      void notifyOrderCancelled(confirmOrder.id);
      setConfirmOrder(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not cancel");
    } finally {
      setCancellingId(null);
    }
  }

  async function handleReorder(order: Order) {
    const catalog = await loadAllProducts();
    let added = 0;
    for (const line of order.items) {
      const item = menuItemFromOrderLine(line, catalog);
      addItem(item, line.quantity);
      added += line.quantity;
    }
    if (added === 0) {
      alert("Nothing from this order could be added.");
      return;
    }
    router.push("/cart");
  }

  return (
    <RequireAuth>
      <AppShell>
        <PageWallpaper src={BG_ORDERS} alt="" overlayClassName="bg-white/75">
          <AppHeader title="Order History" />

          <UnpaidOrdersBanner />
          <main className="mx-auto max-w-[480px] px-4 py-4">
            {loading ? (
              <p className="text-sm text-gray-500">Loading orders…</p>
            ) : error ? (
              <p className="rounded-2xl bg-white p-4 text-sm text-red-700">{error}</p>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-gray-600">No orders yet.</p>
                <Link href="/" className="mt-3 inline-block text-fusion-red underline">
                  Place your first order
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {orders.map((order) => {
                  const needsPay = isCustomerPaymentOpen(order.status, order);
                  return (
                  <li
                    key={order.id}
                    className={`rounded-2xl border bg-white p-4 shadow-sm ${
                      needsPay
                        ? "border-[#ED1C24]/40 ring-2 ring-[#ED1C24]/15"
                        : "border-gray-100"
                    }`}
                  >
                    <Link href={`/track?orderId=${order.id}`}>
                      <div className="flex items-start justify-between gap-3">
                        <CustomerOrderHeading order={order} />
                        <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-[#ED1C24]">
                          {needsPay
                            ? `Unpaid · $${customerAmountDue(order)}`
                            : ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDeliveryAddress(
                          order.college,
                          order.hall,
                        )}
                      </p>
                      <p className="mt-2 text-sm font-semibold">
                        {needsPay
                          ? `Pay $${customerAmountDue(order)}`
                          : `$${order.total}`}
                      </p>
                    </Link>

                    <div className="mt-3 flex gap-2">
                      {canCustomerCancelOrder(order) && (
                        <button
                          type="button"
                          onClick={() => setConfirmOrder(order)}
                          disabled={cancellingId === order.id}
                          className="flex-1 rounded-xl border border-red-200 py-2 text-xs font-semibold text-red-600"
                        >
                          {cancellingId === order.id ? "Cancelling…" : "Cancel"}
                        </button>
                      )}
                      {needsPay && (
                        <Link
                          href={`/pay/${encodeURIComponent(order.id)}`}
                          className="flex-1 rounded-xl bg-[#ED1C24] py-2 text-center text-xs font-semibold text-white"
                        >
                          Pay now
                        </Link>
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

                    {(order.status === "delivered" ||
                      order.status === "runner_paid" ||
                      order.status === "customer_paid" ||
                      order.status === "completed" ||
                      order.status === "paid") &&
                      user &&
                      !orderHasRating(order) && (
                        <div className="mt-3">
                          <RatingModal
                            orderId={order.id}
                            customerId={getUserAccountId(user)}
                            runnerName={order.runnerName}
                            onDone={() => void load()}
                          />
                        </div>
                      )}

                    {orderHasRating(order) && (
                      <p className="mt-2 text-xs text-gray-600">
                        Rated {order.rating ?? order.runnerRating}★
                        {(order.tipAmount ?? 0) > 0
                          ? ` · tip HK$${order.tipAmount}`
                          : ""}
                      </p>
                    )}

                    {isChatActive(order) && (
                      <OrderChatPanel order={order} compact />
                    )}
                  </li>
                  );
                })}
              </ul>
            )}
          </main>

          <CancelOrderConfirmModal
            open={confirmOrder != null}
            loading={cancellingId != null}
            onDismiss={() => {
              if (cancellingId == null) setConfirmOrder(null);
            }}
            onConfirm={() => void handleCancelConfirmed()}
          />
        </PageWallpaper>
      </AppShell>
    </RequireAuth>
  );
}
