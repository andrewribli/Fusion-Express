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
import { RunnerLocationMap } from "@/components/RunnerLocationMap";
import { GuestAccountPrompt } from "@/components/GuestAccountPrompt";
import { RequireCustomer } from "@/components/RequireAuth";
import { useUser, getUserAccountId } from "@/context/UserContext";
import { formatDeliveryAddress } from "@/data/cuhk-locations";
import { CustomerOrderHeading } from "@/components/CustomerOrderHeading";
import { cancelOrder, fetchOrder, approvePriceIncrease } from "@/lib/orders";
import {
  customerAmountDue,
  groceryAmountDue,
  hasConfirmedGroceryTotal,
} from "@/lib/order-status";
import { OrderProofPhotos } from "@/components/CustomerPayPanel";
import { notifyOrderStatus as notifyOrderStatusEmail } from "@/lib/notify-email";
import {
  notifyOrderStatus,
  requestNotificationPermission,
} from "@/lib/notifications";
import { useDeadlineWatch } from "@/lib/use-deadline-watch";
import type { Order } from "@/lib/types";
import { supermarketForCampus } from "@fusion-express/shared/campus";
import { redirectToAirwallexCheckout } from "@/lib/airwallex-checkout";
import { getAuthClient, isFirebaseConfigured } from "@/lib/firebase";

async function paymentAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (!isFirebaseConfigured()) return headers;
  const current = getAuthClient().currentUser;
  if (!current) return headers;
  try {
    headers.Authorization = `Bearer ${await current.getIdToken()}`;
  } catch {
    /* ignore */
  }
  return headers;
}
function TrackContent() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const initialId = searchParams.get("orderId") ?? "";

  const [query, setQuery] = useState(initialId);
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [priceActing, setPriceActing] = useState(false);
  const [rated, setRated] = useState(false);
  const lastStatus = useRef<string | null>(null);
  useDeadlineWatch(order ? [order] : []);

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

  async function handleApprovePrice() {
    if (!order || !user) return;
    setPriceActing(true);
    try {
      await approvePriceIncrease(order.id, getUserAccountId(user));
      await lookup(order.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not approve");
    } finally {
      setPriceActing(false);
    }
  }

  async function handleCancel() {
    if (!order || !user) return;
    setCancelling(true);
    try {
      await cancelOrder(order.id, getUserAccountId(user));
      void notifyOrderStatusEmail({
        customerEmail: user.email ?? order.customerEmail,
        orderId: order.id,
        status: "cancelled",
      });
      await lookup(order.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not cancel");
    } finally {
      setCancelling(false);
    }
  }

  const [paying, setPaying] = useState(false);

  async function handleResumePayment() {
    if (!order) return;
    setPaying(true);
    try {
      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: await paymentAuthHeaders(),
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        intentId?: string;
        clientSecret?: string;
        currency?: string;
        env?: "demo" | "prod";
        alreadyPaid?: boolean;
      };
      if (data.alreadyPaid) {
        await lookup(order.id);
        return;
      }
      if (!res.ok || !data.intentId || !data.clientSecret || !data.env) {
        throw new Error(data.error ?? "Could not start payment.");
      }
      const successUrl = `${window.location.origin}/checkout/payment-return?orderId=${encodeURIComponent(order.id)}`;
      await redirectToAirwallexCheckout({
        intentId: data.intentId,
        clientSecret: data.clientSecret,
        currency: data.currency ?? "HKD",
        env: data.env,
        successUrl,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not open Airwallex.");
    } finally {
      setPaying(false);
    }
  }

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
          <GuestAccountPrompt />

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <CustomerOrderHeading order={order} />

            <p className="mt-2 text-sm text-gray-700">
              {formatDeliveryAddress(order.college, order.hall)}
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
                  <span>
                    ${((item.actualPrice ?? item.price) * item.quantity).toFixed(1)}
                    {item.actualPrice != null && item.actualPrice !== item.price && (
                      <span className="ml-1 text-[11px] text-gray-400">
                        (was ${item.price * item.quantity})
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-2 space-y-1.5 border-t border-gray-100 pt-2 text-sm">
              {(() => {
                const isCanteen =
                  order.orderChannel === "canteen" ||
                  order.items.some((i) => i.itemId.startsWith("canteen:"));
                const foodBeforeDiscount =
                  order.discountApplied && (order.discountAmount ?? 0) > 0
                    ? (order.estimatedSubtotal ??
                        order.subtotal + (order.discountAmount ?? 0))
                    : order.subtotal;
                return (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>{isCanteen ? "Food subtotal" : "Estimated Subtotal"}</span>
                      <span>${foodBeforeDiscount}</span>
                    </div>
                    {order.discountApplied && (order.discountAmount ?? 0) > 0 && (
                      <div className="flex justify-between font-medium text-emerald-700">
                        <span>College Discount (10%)</span>
                        <span>
                          −HK${Number(order.discountAmount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {!isCanteen && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-600">
                          Exact subtotal
                          <span className="mt-0.5 block text-[11px] font-normal text-gray-400">
                            To be confirmed by runner
                          </span>
                        </span>
                        {hasConfirmedGroceryTotal(order) ? (
                          <span className="shrink-0 font-medium text-gray-900">
                            ${groceryAmountDue(order)}
                          </span>
                        ) : (
                          <span className="shrink-0 text-gray-400">Pending</span>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
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
                <span>App estimate</span>
                <span>${order.total}</span>
              </div>
              {hasConfirmedGroceryTotal(order) && (
                <div className="flex justify-between font-bold text-[#ED1C24]">
                  <span>Total to pay</span>
                  <span>${customerAmountDue(order)}</span>
                </div>
              )}
            </div>

            {order.priceAdjustmentStatus === "refund_pending" && (
              <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-xs text-green-800">
                {supermarketForCampus(order.campus)} prices were ${Math.abs(order.priceDifference ?? 0)} lower than the app
                estimate. You will be refunded ${order.refundAmount} within 3–5 business
                days via card, PayMe, or FPS.
              </p>
            )}
            {order.priceAdjustmentStatus === "refunded" && (
              <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-xs text-green-800">
                Refund of ${order.refundAmount} has been marked complete.
              </p>
            )}
            {order.priceAdjustmentStatus === "pending_customer" &&
              user &&
              getUserAccountId(user) === order.customerId && (
                <div className="mt-3 space-y-2 rounded-xl bg-amber-50 px-3 py-3">
                  <p className="text-xs text-amber-900">
                    {supermarketForCampus(order.campus)} prices are higher than the app estimate. New total $
                    {order.actualSubtotal != null
                      ? order.actualSubtotal + order.deliveryFee + (order.tip ?? 0)
                      : order.total}
                    . Approve to continue, or cancel for a full refund of anything already
                    paid.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={priceActing}
                      onClick={() => void handleApprovePrice()}
                      className="flex-1 rounded-xl bg-[#ED1C24] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {priceActing ? "Saving…" : "Approve new total"}
                    </button>
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={() => void handleCancel()}
                      className="flex-1 rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600"
                    >
                      Cancel order
                    </button>
                  </div>
                </div>
              )}

            {(order.status === "accepted" || order.status === "purchased") && (
              <div className="mt-3">
                <RunnerLocationMap location={order.runnerLocation} />
              </div>
            )}

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

            {order.status === "delivered" &&
              !order.paymentReceived &&
              hasConfirmedGroceryTotal(order) && (
                <button
                  type="button"
                  disabled={paying}
                  onClick={() => void handleResumePayment()}
                  className="mt-3 w-full rounded-xl bg-fusion-red py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {paying
                    ? "Opening Airwallex…"
                    : `Pay now · $${customerAmountDue(order)}`}
                </button>
              )}

            {order.status === "delivered" && !hasConfirmedGroceryTotal(order) && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Waiting for the runner to enter the {supermarketForCampus(order.campus)} receipt total. You pay
                that exact amount after it is in.
              </p>
            )}

            <OrderProofPhotos order={order} />
          </div>

          {(order.status === "paid" ||
            order.status === "customer_paid" ||
            order.status === "runner_paid" ||
            order.status === "completed") && (
            <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">
              This order is marked paid
              {order.customerPaidAt
                ? ` at ${order.customerPaidAt.toLocaleTimeString("en-HK", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : ""}
              .
            </p>
          )}

          <OrderProgressBar status={order.status} />

          <OrderChatPanel order={order} compact />

          {(order.status === "delivered" ||
            order.status === "runner_paid" ||
            order.status === "customer_paid" ||
            order.status === "completed") &&
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
    <RequireCustomer>
      <AppShell>
        <LakersWallpaper>
          <AppHeader showBack backHref="/" title="Track Order" />
          <Suspense fallback={<p className="p-4 text-sm text-gray-500">Loading…</p>}>
            <TrackContent />
          </Suspense>
        </LakersWallpaper>
      </AppShell>
    </RequireCustomer>
  );
}
