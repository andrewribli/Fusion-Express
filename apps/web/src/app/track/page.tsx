"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { OrderChatPanel } from "@/components/OrderChatPanel";
import { OrderProgressBar } from "@/components/OrderProgressBar";
import { RatingModal } from "@/components/RatingModal";
import { RequireAuth } from "@/components/RequireAuth";
import { useUser, getUserAccountId } from "@/context/UserContext";
import { formatDeliveryAddress } from "@/data/cuhk-locations";
import { formatEta, getEstimatedDeliveryTime } from "@/lib/constants";
import { cancelOrder, fetchOrder } from "@/lib/orders";
import {
  notifyOrderStatus,
  requestNotificationPermission,
} from "@/lib/notifications";
import type { Order } from "@/lib/types";

function TrackContent() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const initialId = searchParams.get("orderId") ?? "";

  const [query, setQuery] = useState(initialId);
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [rated, setRated] = useState(false);
  const lastStatus = useRef<string | null>(null);

  const lookup = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    const found = await fetchOrder(id.trim());
    if (found && lastStatus.current && lastStatus.current !== found.status) {
      notifyOrderStatus(found.id, found.status);
    }
    if (found) lastStatus.current = found.status;
    setOrder(found);
    setNotFound(!found);
    if (found?.runnerRating) setRated(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    void requestNotificationPermission();
    if (initialId) void lookup(initialId);
  }, [initialId, lookup]);

  useEffect(() => {
    if (!order?.id) return;
    const interval = setInterval(() => lookup(order.id), 5000);
    return () => clearInterval(interval);
  }, [order?.id, lookup]);

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    await lookup(query);
  }

  async function handleCancel() {
    if (!order || !user) return;
    setCancelling(true);
    try {
      await cancelOrder(order.id, getUserAccountId(user));
      await lookup(order.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not cancel");
    } finally {
      setCancelling(false);
    }
  }

  const eta =
    order?.estimatedDeliveryAt ??
    (order ? getEstimatedDeliveryTime(order.createdAt) : null);

  return (
    <main className="mx-auto max-w-[480px] px-4 py-4">
      <form onSubmit={handleTrack} className="space-y-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Order ID e.g. FE-1001"
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-fusion-red py-3 text-sm font-semibold text-white"
        >
          {loading ? "Looking up…" : "Track Order"}
        </button>
      </form>

      {notFound && query && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          No order found for &ldquo;{query}&rdquo;.
        </p>
      )}

      {order && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500">Order ID</p>
                <p className="text-lg font-bold text-fusion-red">{order.id}</p>
              </div>
              {eta && order.status !== "delivered" && order.status !== "cancelled" && (
                <div className="rounded-xl bg-red-50 px-3 py-1.5 text-right">
                  <p className="text-[10px] text-gray-500">ETA</p>
                  <p className="text-sm font-bold text-fusion-red">
                    {formatEta(eta)}
                  </p>
                </div>
              )}
            </div>

            <p className="mt-2 text-sm text-gray-700">
              {formatDeliveryAddress(order.college, order.hall, order.roomNumber)}
            </p>
            <p className="text-xs text-gray-500">Lobby: {order.lobbyPoint}</p>

            {order.customerNote && (
              <p className="mt-2 text-xs text-gray-600">
                Note: {order.customerNote}
              </p>
            )}
            {order.runnerNote && (
              <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
                Runner: {order.runnerNote}
              </p>
            )}

            <ul className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
              {order.items.map((item) => (
                <li key={item.itemId} className="flex justify-between">
                  <span>{item.quantity}× {item.name}</span>
                  <span>${item.price * item.quantity}</span>
                </li>
              ))}
            </ul>

            <div className="mt-2 space-y-0.5 border-t border-gray-100 pt-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${order.subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span>${order.deliveryFee}</span>
              </div>
              {order.tip != null && order.tip > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tip</span>
                  <span>${order.tip}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>${order.total}</span>
              </div>
            </div>

            {order.status === "pending" && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="mt-3 w-full rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600"
              >
                {cancelling ? "Cancelling…" : "Cancel Order"}
              </button>
            )}

            {order.deliveryPhotoUrl && order.status === "delivered" && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500">Delivery proof</p>
                {order.deliveryPhotoUrl.startsWith("mock://") ? (
                  <p className="mt-1 text-xs text-gray-400">Photo uploaded ✓</p>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={order.deliveryPhotoUrl}
                    alt="Delivery proof"
                    className="mt-2 max-h-48 w-full rounded-xl object-cover"
                  />
                )}
              </div>
            )}
          </div>

          <OrderProgressBar status={order.status} />

          <OrderChatPanel order={order} compact />

          {order.status === "delivered" &&
            !order.runnerRating &&
            !rated &&
            user &&
            getUserAccountId(user) === order.customerId && (
              <RatingModal
                orderId={order.id}
                customerId={getUserAccountId(user)}
                runnerName={order.runnerName}
                onDone={() => setRated(true)}
              />
            )}

          {order.runnerRating && (
            <p className="text-center text-sm text-gray-600">
              You rated this delivery {order.runnerRating}★
            </p>
          )}
        </div>
      )}
    </main>
  );
}

export default function TrackPage() {
  return (
    <RequireAuth>
      <AppShell>
        <LakersWallpaper>
          <AppHeader showBack backHref="/home" title="Track Order" />
          <Suspense fallback={<p className="p-4 text-sm text-lakers-gold">Loading…</p>}>
            <TrackContent />
          </Suspense>
        </LakersWallpaper>
      </AppShell>
    </RequireAuth>
  );
}
