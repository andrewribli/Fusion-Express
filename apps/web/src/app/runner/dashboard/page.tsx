"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { OrderChatPanel } from "@/components/OrderChatPanel";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAuth } from "@/components/RequireAuth";
import { formatDeliveryAddress } from "@/data/cuhk-locations";
import { useUser, getUserAccountId } from "@/context/UserContext";
import {
  acceptOrder,
  fetchDeliveredOrdersByRunner,
  fetchPendingOrders,
  fetchRunnerOrders,
  SelfPickupError,
  updateOrderStatus,
  updateRunnerNote,
  uploadDeliveryPhoto,
} from "@/lib/orders";
import { addRunnerEarnings, fetchRunner, findRunnerForUser } from "@/lib/runners";
import {
  runnerEarningsForOrder,
  RUNNER_EARNINGS_RATE,
} from "@/lib/order-status";
import type { Order } from "@/lib/types";
import type { Runner } from "@/lib/types";
import { DELIVERY_FEE } from "@/lib/types";

type Tab = "available" | "active" | "earnings";

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-HK", { hour: "2-digit", minute: "2-digit" });
}

function OrderCard({
  order,
  children,
}: {
  order: Order;
  children?: React.ReactNode;
}) {
  return (
    <li className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex justify-between">
        <p className="font-bold text-gray-900">{order.id}</p>
        <p className="text-xs text-gray-500">{formatTime(order.createdAt)}</p>
      </div>
      <p className="mt-2 text-sm text-gray-700">
        {formatDeliveryAddress(order.college, order.hall, order.roomNumber)}
      </p>
      {order.customerName && (
        <p className="text-xs font-medium text-gray-600">
          Customer: {order.customerName}
        </p>
      )}
      <p className="text-xs text-gray-500">Lobby: {order.lobbyPoint}</p>
      <ul className="mt-2 space-y-0.5 text-sm text-gray-600">
        {order.items.map((item) => (
          <li key={item.itemId}>
            {item.quantity}× {item.name}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-right font-semibold">${order.total}</p>
      {order.customerNote && (
        <p className="mt-2 text-xs text-gray-600">Note: {order.customerNote}</p>
      )}
      {children}
    </li>
  );
}

export default function RunnerDashboardPage() {
  const router = useRouter();
  const { user, setRunnerRegistered } = useUser();
  const [tab, setTab] = useState<Tab>("available");
  const [pending, setPending] = useState<Order[]>([]);
  const [active, setActive] = useState<Order[]>([]);
  const [delivered, setDelivered] = useState<Order[]>([]);
  const [runnerProfile, setRunnerProfile] = useState<Runner | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [photoFiles, setPhotoFiles] = useState<Record<string, File>>({});
  const [runnerNotes, setRunnerNotes] = useState<Record<string, string>>({});
  const [acceptError, setAcceptError] = useState("");
  const initialLoad = useRef(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    if (initialLoad.current) setLoading(true);
    setLoadError("");
    try {
      let runnerId = user.runnerId;
      if (!runnerId) {
        const found = await findRunnerForUser({
          uid: user.uid,
          studentId: user.studentId,
        });
        if (found) {
          runnerId = found.id;
          setRunnerRegistered(found.id, {
            method: found.paymentMethod,
            id: found.paymentId,
          });
        }
      }

      const [p, a, d, r] = await Promise.all([
        fetchPendingOrders(getUserAccountId(user)),
        runnerId ? fetchRunnerOrders(runnerId) : Promise.resolve([]),
        runnerId ? fetchDeliveredOrdersByRunner(runnerId) : Promise.resolve([]),
        runnerId ? fetchRunner(runnerId) : Promise.resolve(null),
      ]);
      setPending(p);
      setActive(a);
      setDelivered(d);
      setRunnerProfile(r);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Could not load orders.",
      );
    } finally {
      setLoading(false);
      initialLoad.current = false;
    }
  }, [user, setRunnerRegistered]);

  useEffect(() => {
    if (!user) return;

    if (user.isRunner) {
      void refresh();
      const interval = setInterval(refresh, 10000);
      return () => clearInterval(interval);
    }

    let cancelled = false;
    void (async () => {
      const found = await findRunnerForUser({
        uid: user.uid,
        studentId: user.studentId,
      });
      if (cancelled) return;
      if (found) {
        setRunnerRegistered(found.id, {
          method: found.paymentMethod,
          id: found.paymentId,
        });
        return;
      }
      router.replace("/runner/terms");
    })();

    return () => {
      cancelled = true;
    };
  }, [user, router, refresh, setRunnerRegistered]);

  async function handleAccept(order: Order) {
    if (!user?.runnerId) {
      setAcceptError("Your runner profile is missing. Open Pick up an order once to finish setup.");
      return;
    }
    setAcceptError("");
    try {
      await acceptOrder(
        order.id,
        user.runnerId,
        user.fullName,
        getUserAccountId(user),
      );
      await refresh();
    } catch (err) {
      if (err instanceof SelfPickupError) {
        setAcceptError(err.message);
      } else {
        setAcceptError("Could not accept order. Try again.");
      }
    }
  }

  async function handlePickedUp(orderId: string) {
    const note = runnerNotes[orderId]?.trim();
    if (note) await updateRunnerNote(orderId, note);
    await updateOrderStatus(orderId, "picked");
    await refresh();
  }

  async function handleDelivered(orderId: string) {
    const file = photoFiles[orderId];
    let photoUrl: string | undefined;
    if (file) {
      photoUrl = await uploadDeliveryPhoto(orderId, file);
    }
    await updateOrderStatus(orderId, "delivered", { deliveryPhotoUrl: photoUrl });

    const order = active.find((o) => o.id === orderId);
    if (order && user?.runnerId) {
      await addRunnerEarnings(
        user.runnerId,
        orderId,
        runnerEarningsForOrder(order.deliveryFee),
      );
    }
    await refresh();
  }

  const earnedPerDelivery = runnerEarningsForOrder(DELIVERY_FEE);
  const totalFromDeliveries = delivered.length * earnedPerDelivery;

  const tabs: { id: Tab; label: string }[] = [
    { id: "available", label: "Available" },
    { id: "active", label: "My Active" },
    { id: "earnings", label: "Earnings" },
  ];

  return (
    <RequireAuth>
      <AppShell>
        <LakersWallpaper>
          <AppHeader title="Runner Dashboard" />

          <main className="mx-auto max-w-[480px] px-4 py-4">
            <div className="flex rounded-xl bg-black/30 p-1 ring-1 ring-lakers-gold/40">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition-colors ${
                    tab === t.id
                      ? "bg-lakers-gold text-lakers-navy shadow-sm"
                      : "text-white/70"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {loadError && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError}
              </p>
            )}

            {loading && (
              <p className="mt-4 text-sm text-lakers-gold">Loading…</p>
            )}

            {!loading && tab === "available" && (
              <section className="mt-4">
                {acceptError && (
                  <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {acceptError}
                  </p>
                )}
                {pending.length === 0 ? (
                  <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
                    <p className="text-4xl">📦</p>
                    <p className="mt-3 text-sm font-medium text-gray-700">
                      No orders available right now. Check back later.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {pending.map((order) => (
                      <OrderCard key={order.id} order={order}>
                        <button
                          type="button"
                          onClick={() => handleAccept(order)}
                          className="mt-3 w-full rounded-xl bg-green-600 py-3 text-sm font-semibold text-white"
                        >
                          Accept Order
                        </button>
                      </OrderCard>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {!loading && tab === "active" && (
              <section className="mt-4">
                {active.length === 0 ? (
                  <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
                    <p className="text-sm text-gray-600">No active orders.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {active.map((order) => (
                      <OrderCard key={order.id} order={order}>
                        <OrderChatPanel order={order} compact />
                        {order.status === "assigned" && (
                          <div className="mt-3 space-y-2">
                            <textarea
                              value={runnerNotes[order.id] ?? ""}
                              onChange={(e) =>
                                setRunnerNotes((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value,
                                }))
                              }
                              placeholder="Note to customer (e.g. substituted item)"
                              rows={2}
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handlePickedUp(order.id)}
                              className="w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white"
                            >
                              Mark as Picked Up
                            </button>
                          </div>
                        )}
                        {order.status === "picked" && (
                          <div className="mt-3 space-y-2">
                            <label className="block text-xs text-gray-500">
                              Delivery photo (optional)
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setPhotoFiles((prev) => ({
                                    ...prev,
                                    [order.id]: file,
                                  }));
                                }
                              }}
                              className="w-full text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleDelivered(order.id)}
                              className="w-full rounded-xl bg-fusion-red py-3 text-sm font-semibold text-white"
                            >
                              Mark as Delivered
                            </button>
                          </div>
                        )}
                      </OrderCard>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {!loading && tab === "earnings" && (
              <section className="mt-4 space-y-4">
                <div className="rounded-2xl bg-gradient-to-br from-lakers-purple to-lakers-navy p-5 text-white shadow-md ring-2 ring-lakers-gold">
                  <p className="text-sm text-lakers-gold">Total Earned</p>
                  <p className="mt-1 text-3xl font-bold">
                    ${runnerProfile?.totalEarned ?? totalFromDeliveries}
                  </p>
                  <p className="mt-2 text-xs text-white/80">
                    {RUNNER_EARNINGS_RATE * 100}% of ${DELIVERY_FEE} delivery fee =
                    ${earnedPerDelivery} per delivery
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-gray-900">
                    Pending Payout
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-600">
                    ${runnerProfile?.pendingPayout ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Paid weekly to {user?.runnerPaymentMethod}:{" "}
                    {user?.runnerPaymentId}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-sm font-semibold text-gray-900">
                    Payout History
                  </p>
                  {delivered.length === 0 ? (
                    <p className="text-sm text-gray-500">No completed deliveries yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {delivered.map((order) => (
                        <li
                          key={order.id}
                          className="flex justify-between border-b border-gray-50 pb-2 text-sm last:border-0"
                        >
                          <span>
                            {order.id} · {formatTime(order.deliveredAt ?? order.updatedAt)}
                          </span>
                          <span className="font-semibold text-green-700">
                            +${earnedPerDelivery}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}
          </main>
        </LakersWallpaper>
      </AppShell>
    </RequireAuth>
  );
}
