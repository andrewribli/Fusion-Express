"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireRunner } from "@/components/RequireAuth";
import { RunnerAcceptConfirmModal } from "@/components/RunnerAcceptConfirmModal";
import { RunnerOrderDetails } from "@/components/RunnerOrderDetails";
import { RunnerOrderPreviewModal } from "@/components/RunnerOrderPreviewModal";
import { RunnerDeliveryFlow } from "@/components/runner/RunnerDeliveryFlow";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import { formatDeliveryAddress } from "@/data/cuhk-locations";
import { useUser, getUserAccountId } from "@/context/UserContext";
import {
  acceptOrder,
  awaitingCustomerPriceApproval,
  fetchDeliveredOrdersByRunner,
  fetchPendingOrders,
  fetchRunnerOrders,
  markDeliveredWithTotal,
  markPurchased,
  OrderAlreadyTakenError,
  SelfPickupError,
  updateRunnerLocation,
  uploadBankStatementPhoto,
  uploadDeliveryPhoto,
  uploadReceiptPhoto,
} from "@/lib/orders";
import { useDeadlineWatch } from "@/lib/use-deadline-watch";
import { compressImage } from "@/lib/compress-image";
import { notifyOrderStatus } from "@/lib/notify-email";
import { fetchRunner, findRunnerForUser } from "@/lib/runners";
import {
  EXPIRED_DELIVERIES_NOTICE,
  formatExpiredAgo,
  isRunnerDeliveryExpired,
  runnerEarningsForOrder,
  runnerExpiredAtOf,
  runnerWarningTotal,
  RUNNER_EARNINGS_RATE,
} from "@/lib/order-status";
import type { Order } from "@/lib/types";
import type { Runner } from "@/lib/types";

type Tab = "available" | "active" | "expired" | "completed";

/** One runner nav destination per view. */
export type RunnerView = "available" | "deliveries" | "expired" | "earnings";

const VIEW_TABS: Record<RunnerView, Tab> = {
  available: "available",
  deliveries: "active",
  expired: "expired",
  earnings: "completed",
};

const VIEW_NAV: { view: RunnerView; label: string; href: string }[] = [
  { view: "available", label: "Available", href: "/runner/dashboard" },
  { view: "deliveries", label: "My Deliveries", href: "/runner/deliveries" },
  { view: "expired", label: "Expired Deliveries", href: "/runner/expired" },
  { view: "earnings", label: "Earnings", href: "/runner/earnings" },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-HK", { hour: "2-digit", minute: "2-digit" });
}

function itemCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

function ExpiredDeliveryCard({
  order,
  now,
  warningCount,
}: {
  order: Order;
  now: number;
  warningCount: number;
}) {
  const expiredAt = runnerExpiredAtOf(order, now);
  return (
    <li
      className="rounded-2xl border p-4 shadow-sm"
      style={{
        backgroundColor: "#2a2a2a",
        borderColor: "#525252",
        color: "#d4d4d4",
        opacity: 0.92,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="break-all font-bold" style={{ color: "#e5e5e5" }}>
          {order.id}
        </p>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: "#525252", color: "#f5f5f5" }}
        >
          Expired
        </span>
      </div>
      <p className="mt-2 text-sm font-medium" style={{ color: "#e5e5e5" }}>
        {order.customerName || "Customer"}
      </p>
      <p className="mt-1 text-sm" style={{ color: "#a3a3a3" }}>
        {formatDeliveryAddress(order.college, order.hall)}
      </p>
      {order.lobbyPoint ? (
        <p className="text-xs" style={{ color: "#a3a3a3" }}>
          Lobby: {order.lobbyPoint}
        </p>
      ) : null}
      <p className="mt-2 text-sm font-semibold" style={{ color: "#d4d4d4" }}>
        {expiredAt ? formatExpiredAgo(expiredAt, now) : "Expired"}
      </p>
      <p className="mt-1 text-sm" style={{ color: "#a3a3a3" }}>
        Warnings: {warningCount}
      </p>
    </li>
  );
}

function ExpiredDeliveriesColumn({
  orders,
  now,
}: {
  orders: Order[];
  now: number;
}) {
  const warningCount = runnerWarningTotal(orders, now);
  return (
    <section>
      <h2 className="text-sm font-bold text-white">Expired Deliveries</h2>
      <p
        className="mt-2 rounded-xl px-3 py-3 text-sm leading-snug"
        style={{ backgroundColor: "#3a2a12", color: "#fde68a" }}
      >
        {EXPIRED_DELIVERIES_NOTICE}
      </p>
      {orders.length === 0 ? (
        <div
          className="mt-3 rounded-2xl px-6 py-10 text-center"
          style={{ backgroundColor: "#2a2a2a", color: "#a3a3a3" }}
        >
          <p className="text-sm">No expired deliveries.</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {orders.map((order) => (
            <ExpiredDeliveryCard
              key={order.id}
              order={order}
              now={now}
              warningCount={warningCount}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function AvailableOrderCard({
  order,
  onViewDetails,
  onAccept,
}: {
  order: Order;
  onViewDetails: () => void;
  onAccept: () => void;
}) {
  const preview = order.items.slice(0, 2);
  const extra = order.items.length - preview.length;
  const earn = runnerEarningsForOrder(order.deliveryFee);

  return (
    <li className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex justify-between gap-3">
        <p className="font-bold text-gray-900">{order.id}</p>
        <p className="shrink-0 text-xs text-gray-500">{formatTime(order.createdAt)}</p>
      </div>
      <p className="mt-2 text-sm font-medium text-gray-800">
        {formatDeliveryAddress(order.college, order.hall)}
      </p>
      <p className="text-xs text-gray-500">Lobby: {order.lobbyPoint}</p>
      <ul className="mt-2 space-y-0.5 text-sm text-gray-600">
        {preview.map((item) => (
          <li key={item.itemId}>
            {item.quantity}× {item.name}
          </li>
        ))}
        {extra > 0 && (
          <li className="text-xs text-gray-500">+{extra} more item{extra === 1 ? "" : "s"}</li>
        )}
      </ul>
      <p className="mt-2 text-sm font-semibold text-[#ED1C24]">
        You earn ${earn} · {itemCount(order)} item{itemCount(order) === 1 ? "" : "s"}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onViewDetails}
          className="flex-1 rounded-xl border-2 border-[#ED1C24] py-3 text-sm font-semibold text-[#ED1C24]"
        >
          View Details
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 rounded-xl bg-[#ED1C24] py-3 text-sm font-semibold text-white"
        >
          Accept Order
        </button>
      </div>
    </li>
  );
}

export function RunnerWorkspace({ view }: { view: RunnerView }) {
  const router = useRouter();
  const { user, setRunnerRegistered } = useUser();
  const tab = VIEW_TABS[view];
  const [pending, setPending] = useState<Order[]>([]);
  const [active, setActive] = useState<Order[]>([]);
  const [delivered, setDelivered] = useState<Order[]>([]);
  const [runnerProfile, setRunnerProfile] = useState<Runner | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [photoFiles, setPhotoFiles] = useState<Record<string, File>>({});
  const [receiptFiles, setReceiptFiles] = useState<Record<string, File>>({});
  const [bankFiles, setBankFiles] = useState<Record<string, File>>({});
  const [finalTotals, setFinalTotals] = useState<Record<string, string>>({});
  const [acceptError, setAcceptError] = useState("");
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [bagConfirmed, setBagConfirmed] = useState<Record<string, boolean>>({});
  const [deliverError, setDeliverError] = useState("");
  const [purchasingId, setPurchasingId] = useState("");
  const [flowOrderId, setFlowOrderId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const initialLoad = useRef(true);
  const purchaseInFlight = useRef(new Set<string>());
  const openDeliveries = active.filter(
    (order) => !isRunnerDeliveryExpired(order, now),
  );
  const expiredDeliveries = active.filter((order) =>
    isRunnerDeliveryExpired(order, now),
  );
  useDeadlineWatch(active);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    if (initialLoad.current) setLoading(true);
    setLoadError("");
    try {
      // The profile already carries runnerId once registered; only look it up
      // when it is missing, so the 10s poll does not re-query /runners.
      let runnerId = user.runnerId;
      if (!runnerId) {
        const found = await findRunnerForUser({
          uid: user.uid,
          studentId: user.studentId,
        });
        runnerId = found?.id;
        if (found) {
          setRunnerRegistered(found.id, {
            method: found.paymentMethod,
            id: found.paymentId,
          });
        }
      }

      // Runner order queries filter on the auth uid, not the /runners doc id.
      const runnerUid = user.uid;
      const [p, a, d, r] = await Promise.all([
        fetchPendingOrders(getUserAccountId(user)),
        runnerUid ? fetchRunnerOrders(runnerUid) : Promise.resolve([]),
        runnerUid
          ? fetchDeliveredOrdersByRunner(runnerUid)
          : Promise.resolve([]),
        runnerId ? fetchRunner(runnerId) : Promise.resolve(null),
      ]);
      setPending(p);
      setActive((prev) =>
        a.map((order) => {
          if (!purchaseInFlight.current.has(order.id)) return order;
          if (order.status === "purchased") {
            purchaseInFlight.current.delete(order.id);
            return order;
          }
          const local = prev.find((item) => item.id === order.id);
          if (local?.status === "purchased") {
            return {
              ...order,
              status: "purchased",
              receiptUrl: local.receiptUrl ?? order.receiptUrl,
              bankStatementUrl: local.bankStatementUrl ?? order.bankStatementUrl,
            };
          }
          return order;
        }),
      );
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

  const activeIds = openDeliveries.map((o) => o.id).join(",");
  useEffect(() => {
    if (!user?.isRunner || !activeIds) return;
    if (!navigator.geolocation) return;
    const ids = activeIds.split(",");
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        for (const id of ids) {
          void updateRunnerLocation(id, pos.coords.latitude, pos.coords.longitude);
        }
      },
      () => {
        /* permission denied — map stays empty */
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [user?.isRunner, activeIds]);

  function requestAccept(order: Order) {
    setAcceptError("");
    setPreviewOrder(null);
    setConfirmOrder(order);
  }

  async function handleConfirmAccept() {
    if (!user || !confirmOrder) return;
    const found = user.runnerId
      ? { id: user.runnerId }
      : await findRunnerForUser({
          uid: user.uid,
          studentId: user.studentId,
        });
    if (!found) {
      setAcceptError("Your runner profile is missing. Open Pick up an order once to finish setup.");
      setConfirmOrder(null);
      return;
    }
    setAccepting(true);
    setAcceptError("");
    try {
      await acceptOrder(
        confirmOrder.id,
        found.id,
        user.fullName,
        getUserAccountId(user),
        {
          method: user.runnerPaymentMethod ?? "PayMe",
          id: user.runnerPaymentId ?? user.phone ?? "",
          email: user.email,
        },
      );
      setConfirmOrder(null);
      router.push("/runner/deliveries");
      void notifyOrderStatus({
        customerEmail: confirmOrder.customerEmail,
        orderId: confirmOrder.id,
        status: "accepted",
      });
      await refresh();
    } catch (err) {
      if (err instanceof SelfPickupError || err instanceof OrderAlreadyTakenError) {
        setAcceptError(err.message);
      } else {
        setAcceptError("Could not accept order. Try again.");
      }
      setConfirmOrder(null);
    } finally {
      setAccepting(false);
    }
  }

  async function handlePurchased(orderId: string): Promise<boolean> {
    const receipt = receiptFiles[orderId];
    const bank = bankFiles[orderId];
    if (!receipt) {
      setDeliverError("Please upload your receipt first.");
      return false;
    }
    if (!bank) {
      setDeliverError("Please upload your bank statement first.");
      return false;
    }

    const order = openDeliveries.find((o) => o.id === orderId);
    setDeliverError("");
    purchaseInFlight.current.add(orderId);
    setActive((prev) =>
      prev.map((item) =>
        item.id === orderId ? { ...item, status: "purchased" } : item,
      ),
    );

    void (async () => {
      try {
        const [receiptFile, bankFile] = await Promise.all([
          compressImage(receipt),
          compressImage(bank),
        ]);
        const [receiptUrl, bankStatementUrl] = await Promise.all([
          uploadReceiptPhoto(orderId, receiptFile),
          uploadBankStatementPhoto(orderId, bankFile),
        ]);
        await markPurchased(orderId, { receiptUrl, bankStatementUrl });
        setActive((prev) =>
          prev.map((item) =>
            item.id === orderId
              ? { ...item, status: "purchased", receiptUrl, bankStatementUrl }
              : item,
          ),
        );
        if (order) {
          void notifyOrderStatus({
            customerEmail: order.customerEmail,
            orderId,
            status: "purchased",
          });
        }
        await refresh();
      } catch (err) {
        purchaseInFlight.current.delete(orderId);
        setActive((prev) =>
          prev.map((item) =>
            item.id === orderId && item.status === "purchased"
              ? { ...item, status: "accepted" }
              : item,
          ),
        );
        setDeliverError(
          err instanceof Error
            ? err.message
            : "Could not save the purchase. You can keep going — it will save again when you mark delivered.",
        );
      }
    })();

    return true;
  }

  async function handleDelivered(orderId: string): Promise<boolean> {
    const order = openDeliveries.find((o) => o.id === orderId);
    const file = photoFiles[orderId];
    const bank = bankFiles[orderId];
    const receipt = receiptFiles[orderId];
    const finalTotal = Number(finalTotals[orderId]);
    if (!order?.receiptUrl && !receipt) {
      setDeliverError("Upload the Fusion receipt photo.");
      return false;
    }
    if (!order?.bankStatementUrl && !bank) {
      setDeliverError("Upload a bank statement of the Fusion payment.");
      return false;
    }
    if (!file) {
      setDeliverError("A lobby photo is required before you mark delivered.");
      return false;
    }
    if (!(finalTotal > 0)) {
      setDeliverError("Enter the final Fusion receipt total before marking delivered.");
      return false;
    }
    if (!bagConfirmed[orderId]) {
      setDeliverError(
        "Confirm you wrote the customer's full name on the receipt and attached it to the bag.",
      );
      return false;
    }
    setDeliverError("");
    setPurchasingId(orderId);
    try {
    const [photo, bankPhoto, receiptPhoto] = await Promise.all([
      compressImage(file),
      bank ? compressImage(bank) : Promise.resolve(undefined),
      receipt ? compressImage(receipt) : Promise.resolve(undefined),
    ]);
    const [photoUrl, bankStatementUrl, receiptUrl] = await Promise.all([
      uploadDeliveryPhoto(orderId, photo),
      bankPhoto
        ? uploadBankStatementPhoto(orderId, bankPhoto)
        : Promise.resolve(order?.bankStatementUrl),
      receiptPhoto
        ? uploadReceiptPhoto(orderId, receiptPhoto)
        : Promise.resolve(order?.receiptUrl),
    ]);
    if (!bankStatementUrl) {
      setDeliverError("Upload a bank statement of the Fusion payment.");
      return false;
    }
    await markDeliveredWithTotal(orderId, {
      finalTotal,
      deliveryPhotoUrl: photoUrl,
      bankStatementUrl,
      receiptUrl,
      runnerVerified: true,
    });

    if (order) {
      void notifyOrderStatus({
        customerEmail: order.customerEmail,
        orderId,
        status: "delivered",
      });
    }
    await refresh();
    return true;
    } catch (err) {
      setDeliverError(
        err instanceof Error ? err.message : "Could not mark as delivered.",
      );
      return false;
    } finally {
      setPurchasingId("");
    }
  }

  const flowOrder =
    openDeliveries.find((order) => order.id === flowOrderId) ?? null;

  const totalFromDeliveries = delivered.reduce(
    (sum, order) => sum + runnerEarningsForOrder(order.deliveryFee),
    0,
  );

  return (
    <RequireRunner>
      <AppShell>
        <LakersWallpaper>
          <AppHeader title="Runner Dashboard" />

          <main
            className={`mx-auto px-4 py-4 ${
              view === "deliveries" ? "max-w-[480px] lg:max-w-5xl" : "max-w-[480px]"
            }`}
          >
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1 ring-1 ring-lakers-gold/40 sm:grid-cols-4">
              {VIEW_NAV.map((item) => (
                <Link
                  key={item.view}
                  href={item.href}
                  className={`rounded-lg px-1 py-2.5 text-center text-xs font-semibold leading-tight transition-colors ${
                    view === item.view
                      ? "bg-lakers-gold text-lakers-navy shadow-sm"
                      : "text-white/70"
                  }`}
                >
                  {item.label}
                  {item.view === "expired" && expiredDeliveries.length > 0
                    ? ` (${expiredDeliveries.length})`
                    : ""}
                </Link>
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
                    <p className="text-sm font-medium text-gray-700">
                      No orders available right now. Check back later.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {pending.map((order) => (
                      <AvailableOrderCard
                        key={order.id}
                        order={order}
                        onViewDetails={() => setPreviewOrder(order)}
                        onAccept={() => requestAccept(order)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )}

            {!loading && tab === "active" && (
              <section className="mt-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
                <div>
                {deliverError && (
                  <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {deliverError}
                  </p>
                )}
                {openDeliveries.length === 0 ? (
                  <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
                    <p className="text-sm text-gray-600">No accepted orders.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {openDeliveries.map((order) => (
                      <li
                        key={order.id}
                        className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-gray-900">
                              {formatDeliveryAddress(order.college, order.hall)}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">{order.id}</p>
                          </div>
                          <p className="shrink-0 text-xs font-semibold text-[#ED1C24]">
                            {order.status === "purchased" ? "Ready to deliver" : "Accepted"}
                          </p>
                        </div>
                        <DeadlineBanner order={order} party="runner" />
                        <button
                          type="button"
                          onClick={() => {
                            setDeliverError("");
                            setFlowOrderId(order.id);
                          }}
                          className="mt-3 min-h-12 w-full rounded-xl bg-[#ED1C24] text-sm font-bold text-white"
                        >
                          {order.status === "purchased" ? "Continue delivery" : "Start order"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                </div>
                <div
                  className={`mt-6 lg:mt-0 ${
                    expiredDeliveries.length === 0 ? "hidden lg:block" : ""
                  }`}
                >
                  <ExpiredDeliveriesColumn orders={expiredDeliveries} now={now} />
                </div>
              </section>
            )}

            {!loading && tab === "expired" && (
              <div className="mt-4">
                <ExpiredDeliveriesColumn orders={expiredDeliveries} now={now} />
              </div>
            )}

            {!loading && tab === "completed" && (
              <section className="mt-4 space-y-4">
                <div className="rounded-2xl bg-gradient-to-br from-lakers-purple to-lakers-navy p-5 text-white shadow-md ring-2 ring-lakers-gold">
                  <p className="text-sm text-lakers-gold">Total Earned</p>
                  <p className="mt-1 text-3xl font-bold">
                    ${runnerProfile?.totalEarned ?? totalFromDeliveries}
                  </p>
                  <p className="mt-2 text-xs text-white/80">
                    You keep {RUNNER_EARNINGS_RATE * 100}% of each order&apos;s delivery fee.
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

                {delivered.length === 0 ? (
                  <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
                    <p className="text-sm text-gray-500">No completed deliveries yet.</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {delivered.map((order) => (
                      <li
                        key={order.id}
                        className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                      >
                        <div className="flex justify-between gap-3">
                          <p className="font-bold text-gray-900">{order.id}</p>
                          <p className="text-xs text-gray-500">
                            {formatTime(order.deliveredAt ?? order.updatedAt)}
                          </p>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-green-700">
                          +${runnerEarningsForOrder(order.deliveryFee)}
                        </p>
                        <div className="mt-3">
                          <RunnerOrderDetails order={order} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </main>
        </LakersWallpaper>
      </AppShell>

      <RunnerOrderPreviewModal
        order={previewOrder}
        onClose={() => setPreviewOrder(null)}
        onAccept={
          previewOrder ? () => requestAccept(previewOrder) : undefined
        }
      />
      {flowOrder && (
        <RunnerDeliveryFlow
          order={flowOrder}
          receiptFile={receiptFiles[flowOrder.id]}
          bankFile={bankFiles[flowOrder.id]}
          photoFile={photoFiles[flowOrder.id]}
          finalTotal={finalTotals[flowOrder.id] ?? ""}
          bagConfirmed={Boolean(bagConfirmed[flowOrder.id])}
          busy={purchasingId === flowOrder.id}
          error={deliverError}
          onReceipt={(file) =>
            setReceiptFiles((prev) => ({ ...prev, [flowOrder.id]: file }))
          }
          onBank={(file) =>
            setBankFiles((prev) => ({ ...prev, [flowOrder.id]: file }))
          }
          onPhoto={(file) =>
            setPhotoFiles((prev) => ({ ...prev, [flowOrder.id]: file }))
          }
          onFinalTotal={(value) =>
            setFinalTotals((prev) => ({ ...prev, [flowOrder.id]: value }))
          }
          onBagConfirmed={(value) =>
            setBagConfirmed((prev) => ({ ...prev, [flowOrder.id]: value }))
          }
          onPurchased={() => handlePurchased(flowOrder.id)}
          onDelivered={() => handleDelivered(flowOrder.id)}
          onClose={() => setFlowOrderId(null)}
        />
      )}
      <RunnerAcceptConfirmModal
        order={confirmOrder}
        loading={accepting}
        onConfirm={() => void handleConfirmAccept()}
        onCancel={() => {
          if (!accepting) setConfirmOrder(null);
        }}
      />
    </RequireRunner>
  );
}
