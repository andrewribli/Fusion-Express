"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { AdminSupportChat } from "@/components/AdminSupportChat";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireRunner } from "@/components/RequireAuth";
import { RunnerAcceptConfirmModal } from "@/components/RunnerAcceptConfirmModal";
import { RunnerOrderDetails } from "@/components/RunnerOrderDetails";
import { RunnerOrderPreviewModal } from "@/components/RunnerOrderPreviewModal";
import { RunnerDeliveryFlow } from "@/components/runner/RunnerDeliveryFlow";
import { CanteenDeliveryFlow } from "@/components/runner/CanteenDeliveryFlow";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import { OrderChannelBadge, resolveOrderChannel } from "@/components/OrderChannelBadge";
import { CollegeDiscountRunnerBadge } from "@/components/CollegeDiscountRunnerBadge";
import { formatDeliveryAddress } from "@/data/cuhk-locations";
import { useUser, getUserAccountId } from "@/context/UserContext";
import {
  acceptOrder,
  awaitingCustomerPriceApproval,
  fetchDeliveredOrdersByRunner,
  fetchRunnerOrders,
  orderCampus,
  markCanteenDelivered,
  markCanteenPickedUp,
  markDeliveredWithTotal,
  markPurchased,
  OrderAlreadyTakenError,
  saveRunnerDeliveryProgress,
  SelfPickupError,
  subscribePendingOrders,
  updateRunnerLocation,
  uploadBankStatementPhoto,
  uploadDeliveryPhoto,
  uploadReceiptPhoto,
} from "@/lib/orders";
import { buildAcceptDiscount } from "@/lib/canteen-discount";
import { useDeadlineWatch } from "@/lib/use-deadline-watch";
import { RUNNER_BOARD_REFRESH_EVENT } from "@/lib/runner-board-refresh";
import { compressImage } from "@/lib/compress-image";
import { notifyOrderStatus } from "@/lib/notify-email";
import { notifyCanteenEvent } from "@/lib/notify-canteen";
import { fetchRunner, findRunnerForUser } from "@/lib/runners";
import { ownerPaymentDetails } from "@/lib/owner-payment";
import { lookupRunnerCustomerName } from "@/lib/runner-customer-name";
import {
  EXPIRED_DELIVERIES_NOTICE,
  formatExpiredAgo,
  isRunnerDeliveryExpired,
  customerAmountDue,
  runnerEarningsForOrder,
  runnerExpiredAtOf,
  runnerWarningTotal,
  RUNNER_EARNINGS_RATE,
} from "@/lib/order-status";
import type { Order } from "@/lib/types";
import type { Runner } from "@/lib/types";
import {
  resolveCampus,
  supermarketForCampus,
} from "@fusion-express/shared/campus";

function runnerCampusOf(user: { campus?: unknown }) {
  return resolveCampus(user.campus);
}

type Tab = "available" | "active" | "expired" | "completed";

/** One runner nav destination per view. */
export type RunnerView = "available" | "deliveries" | "expired" | "earnings";

const VIEW_TABS: Record<RunnerView, Tab> = {
  available: "available",
  deliveries: "active",
  expired: "expired",
  earnings: "completed",
};

/** CUHK `/runner/*` or CityU `/cityu/runner/*`. Same workspace, campus-scoped routes. */
export type RunnerWorkspaceScope = "cuhk" | "cityu";

const RUNNER_NAV: Record<
  RunnerWorkspaceScope,
  { view: RunnerView; label: string; href: string }[]
> = {
  cuhk: [
    { view: "available", label: "Available", href: "/runner/dashboard" },
    { view: "deliveries", label: "My Deliveries", href: "/runner/deliveries" },
    { view: "expired", label: "Expired Deliveries", href: "/runner/expired" },
    { view: "earnings", label: "Earnings", href: "/runner/earnings" },
  ],
  cityu: [
    { view: "available", label: "Available", href: "/cityu/runner/dashboard" },
    { view: "deliveries", label: "My Deliveries", href: "/cityu/runner/deliveries" },
    { view: "expired", label: "Expired Deliveries", href: "/cityu/runner/expired" },
    { view: "earnings", label: "Earnings", href: "/cityu/runner/earnings" },
  ],
};

function runnerSetupHref(scope: RunnerWorkspaceScope): string {
  return scope === "cityu" ? "/cityu/runner/register" : "/runner/terms";
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-HK", { hour: "2-digit", minute: "2-digit" });
}

const HK_WEEKDAY: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** Monday 00:00 Asia/Hong_Kong, as a UTC timestamp. */
function startOfWeekHkMs(now: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(new Date(now));
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const year = Number(value("year"));
  const month = Number(value("month"));
  const day = Number(value("day"));
  const offset = HK_WEEKDAY[value("weekday")] ?? 0;
  const mondayUtc = Date.UTC(year, month - 1, day) - offset * 86_400_000;
  return mondayUtc - 8 * 3_600_000;
}

function itemCount(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Available-card title. A missing name stays "Customer", never the document id. */
function customerCardTitle(order: Order): string {
  const name = order.customerName?.trim();
  if (!name || name === order.id) return "Customer";
  return name;
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
  runnerCollege,
  onViewDetails,
  onAccept,
}: {
  order: Order;
  runnerCollege?: string | null;
  onViewDetails: () => void;
  onAccept: () => void;
}) {
  const preview = order.items.slice(0, 2);
  const extra = order.items.length - preview.length;
  const earn = runnerEarningsForOrder(order.deliveryFee);

  return (
    <li className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex justify-between gap-3">
        <p className="flex flex-wrap items-center gap-2 font-bold text-gray-900">
          {customerCardTitle(order)}
          <OrderChannelBadge order={order} />
        </p>
        <p className="shrink-0 text-xs text-gray-500">{formatTime(order.createdAt)}</p>
      </div>
      <p className="mt-2 text-sm font-medium text-gray-800">
        {formatDeliveryAddress(order.college, order.hall)}
      </p>
      <p className="text-xs text-gray-500">Lobby: {order.lobbyPoint}</p>
      <div className="mt-2">
        <CollegeDiscountRunnerBadge order={order} runnerCollege={runnerCollege} />
      </div>
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

export function RunnerWorkspace({
  view,
  scope = "cuhk",
}: {
  view: RunnerView;
  scope?: RunnerWorkspaceScope;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setRunnerRegistered } = useUser();
  const nav = RUNNER_NAV[scope];
  const [pane, setPane] = useState<RunnerView>(view);
  const [boardNonce, setBoardNonce] = useState(0);
  const tab = VIEW_TABS[pane];
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
  const [uploading, setUploading] = useState<
    "" | "receipt" | "bank" | "photo" | "total"
  >("");
  const [flowOrderId, setFlowOrderId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const initialLoad = useRef(true);
  const finalTotalSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<
    Record<
      string,
      {
        receiptUrl?: string;
        bankStatementUrl?: string;
        deliveryPhotoUrl?: string;
        finalTotal?: number;
        runnerVerified?: boolean;
        status?: Order["status"];
      }
    >
  >({});
  const openDeliveries = active.filter(
    (order) => !isRunnerDeliveryExpired(order, now),
  );
  const expiredDeliveries = active.filter((order) =>
    isRunnerDeliveryExpired(order, now),
  );
  useDeadlineWatch(active);

  useEffect(() => {
    setPane(view);
  }, [view]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setFinalTotals((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const order of active) {
        if (order.finalTotal != null && (next[order.id] == null || next[order.id] === "")) {
          next[order.id] = String(order.finalTotal);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setBagConfirmed((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const order of active) {
        if (order.runnerVerified && !next[order.id]) {
          next[order.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [active]);

  function patchActiveOrder(orderId: string, patch: Partial<Order>) {
    progressRef.current[orderId] = {
      ...progressRef.current[orderId],
      ...patch,
    };
    setActive((prev) =>
      prev.map((item) => (item.id === orderId ? { ...item, ...patch } : item)),
    );
  }

  function orderWithProgress(orderId: string): Order | undefined {
    const order = openDeliveries.find((o) => o.id === orderId);
    if (!order) return undefined;
    return { ...order, ...progressRef.current[orderId] };
  }

  async function withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    label: string,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(
                  `${label} timed out. Check your connection and try again.`,
                ),
              ),
            ms,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function maybeMarkPurchased(orderId: string) {
    const order = orderWithProgress(orderId);
    const cityu = order?.campus === "cityu";
    if (!order?.receiptUrl || (!cityu && !order.bankStatementUrl)) return;
    if (
      order.status === "delivered" ||
      order.status === "receipt_uploaded" ||
      (order.status === "purchased" && !cityu)
    ) {
      return;
    }
    if (order.status !== "purchased") {
      await markPurchased(orderId, {
        receiptUrl: order.receiptUrl,
        bankStatementUrl: order.bankStatementUrl,
      });
      patchActiveOrder(orderId, { status: "purchased" });
    }
    if (cityu) {
      const { postOrderTransition } = await import("@/lib/order-transition");
      await postOrderTransition({
        orderId,
        to: "receipt_uploaded",
        receiptUrl: order.receiptUrl,
        receiptAmount: order.finalTotal,
      });
      patchActiveOrder(orderId, { status: "receipt_uploaded" });
    }
    void notifyOrderStatus({
      customerEmail: order.customerEmail,
      orderId,
      status: cityu ? "receipt_uploaded" : "purchased",
    });
  }

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
      const [a, d, r] = await Promise.all([
        runnerUid ? fetchRunnerOrders(runnerUid) : Promise.resolve([]),
        runnerUid
          ? fetchDeliveredOrdersByRunner(runnerUid)
          : Promise.resolve([]),
        runnerId ? fetchRunner(runnerId) : Promise.resolve(null),
      ]);
      const onCampus = (rows: Order[]) =>
        scope === "cityu"
          ? rows.filter((order) => orderCampus(order) === "cityu")
          : rows;
      setActive(
        onCampus(a).map((order) => {
          const local = progressRef.current[order.id];
          if (!local) return order;
          return {
            ...order,
            receiptUrl: order.receiptUrl ?? local.receiptUrl,
            bankStatementUrl: order.bankStatementUrl ?? local.bankStatementUrl,
            deliveryPhotoUrl: order.deliveryPhotoUrl ?? local.deliveryPhotoUrl,
            finalTotal: order.finalTotal ?? local.finalTotal,
            runnerVerified: order.runnerVerified || local.runnerVerified,
            status:
              order.status === "accepted" && local.status === "purchased"
                ? "purchased"
                : order.status,
          };
        }),
      );
      setDelivered(onCampus(d));
      setRunnerProfile(r);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Could not load orders.",
      );
    } finally {
      setLoading(false);
      initialLoad.current = false;
    }
  }, [user, setRunnerRegistered, scope]);

  useEffect(() => {
    function onRefresh() {
      setPane("available");
      setBoardNonce((value) => value + 1);
      void refresh();
    }
    window.addEventListener(RUNNER_BOARD_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(RUNNER_BOARD_REFRESH_EVENT, onRefresh);
  }, [refresh]);

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
      router.replace(runnerSetupHref(scope));
    })();

    return () => {
      cancelled = true;
    };
  }, [user, router, refresh, setRunnerRegistered, scope]);

  useEffect(() => {
    if (!user?.isRunner) {
      setPending([]);
      return;
    }
    return subscribePendingOrders(
      (orders) => {
        setPending(orders);
      },
      {
        excludeCustomerId: getUserAccountId(user),
        excludeCustomerEmail: user.email,
        campus: scope === "cityu" ? "cityu" : runnerCampusOf(user),
        onError: (err) => {
          setLoadError(err.message || "Could not load available orders.");
        },
      },
    );
  }, [user, scope, boardNonce]);

  useEffect(() => {
    const missing = pending.filter((order) => {
      const name = order.customerName?.trim();
      return !name || name === order.id;
    });
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missing.map(async (order) => ({
        id: order.id,
        name: (await lookupRunnerCustomerName(order.id)).trim(),
      })),
    ).then((rows) => {
      if (cancelled) return;
      const byId = new Map(
        rows
          .filter((row) => row.name && row.name !== row.id)
          .map((row) => [row.id, row.name]),
      );
      if (byId.size === 0) return;
      setPending((prev) =>
        prev.map((order) => {
          const name = byId.get(order.id);
          const current = order.customerName?.trim();
          if (!name || (current && current !== order.id)) return order;
          return { ...order, customerName: name };
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [pending]);

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
    if (
      scope === "cityu" &&
      openDeliveries.some((order) =>
        order.status === "accepted" ||
        order.status === "purchased" ||
        order.status === "receipt_uploaded",
      )
    ) {
      setAcceptError("Finish your current delivery before accepting another order.");
      setConfirmOrder(null);
      return;
    }
    setAccepting(true);
    setAcceptError("");
    try {
      const runnerCollege =
        runnerProfile?.college || user.college || undefined;
      const discount = buildAcceptDiscount(confirmOrder, runnerCollege);
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
        discount,
        scope === "cityu" ? "cityu" : runnerCampusOf(user),
      );
      setConfirmOrder(null);
      router.push(
        scope === "cityu" ? "/cityu/runner/deliveries" : "/runner/deliveries",
      );
      void notifyOrderStatus({
        customerEmail: confirmOrder.customerEmail,
        orderId: confirmOrder.id,
        status: "accepted",
        runnerEmail: user.email,
        runnerName: user.fullName,
        customerName: confirmOrder.customerName,
        deliveryLocation: `${formatDeliveryAddress(confirmOrder.college, confirmOrder.hall)} · Lobby: ${confirmOrder.lobbyPoint}`,
        estimate: discount?.total ?? confirmOrder.total,
      });
      if (discount?.discountApplied) {
        void notifyCanteenEvent({
          orderId: confirmOrder.id,
          event: "discount_received",
        });
      }
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

  async function handleReceiptUpload(orderId: string, file: File) {
    setReceiptFiles((prev) => ({ ...prev, [orderId]: file }));
    setDeliverError("");
    setUploading("receipt");
    try {
      const compressed = await withTimeout(
        compressImage(file),
        20000,
        "Receipt compress",
      );
      const receiptUrl = await withTimeout(
        uploadReceiptPhoto(orderId, compressed),
        45000,
        "Receipt upload",
      );
      await withTimeout(
        saveRunnerDeliveryProgress(orderId, { receiptUrl }),
        15000,
        "Save receipt",
      );
      patchActiveOrder(orderId, { receiptUrl });
      await maybeMarkPurchased(orderId);
    } catch (err) {
      console.error("Receipt save failed", err);
      setDeliverError(
        err instanceof Error ? err.message : "Receipt upload failed. Please try again.",
      );
    } finally {
      setUploading("");
    }
  }

  async function handleBankUpload(orderId: string, file: File) {
    setBankFiles((prev) => ({ ...prev, [orderId]: file }));
    setDeliverError("");
    setUploading("bank");
    try {
      const compressed = await withTimeout(
        compressImage(file),
        20000,
        "Bank compress",
      );
      const bankStatementUrl = await withTimeout(
        uploadBankStatementPhoto(orderId, compressed),
        45000,
        "Bank statement upload",
      );
      await withTimeout(
        saveRunnerDeliveryProgress(orderId, { bankStatementUrl }),
        15000,
        "Save bank statement",
      );
      patchActiveOrder(orderId, { bankStatementUrl });
      await maybeMarkPurchased(orderId);
    } catch (err) {
      console.error("Bank statement save failed", err);
      setDeliverError(
        err instanceof Error
          ? err.message
          : "Bank statement upload failed. Please try again.",
      );
    } finally {
      setUploading("");
    }
  }

  async function handleLobbyUpload(orderId: string, file: File) {
    setPhotoFiles((prev) => ({ ...prev, [orderId]: file }));
    setDeliverError("");
    setUploading("photo");
    try {
      const compressed = await withTimeout(
        compressImage(file),
        20000,
        "Photo compress",
      );
      const deliveryPhotoUrl = await withTimeout(
        uploadDeliveryPhoto(orderId, compressed),
        45000,
        "Lobby photo upload",
      );
      await withTimeout(
        saveRunnerDeliveryProgress(orderId, { deliveryPhotoUrl }),
        15000,
        "Save lobby photo",
      );
      patchActiveOrder(orderId, { deliveryPhotoUrl });
    } catch (err) {
      console.error("Lobby photo save failed", err);
      setDeliverError(
        err instanceof Error
          ? err.message
          : "Lobby photo upload failed. Please try again.",
      );
    } finally {
      setUploading("");
    }
  }

  async function handleBagConfirmed(orderId: string, value: boolean) {
    setBagConfirmed((prev) => ({ ...prev, [orderId]: value }));
    setDeliverError("");
    try {
      await withTimeout(
        saveRunnerDeliveryProgress(orderId, { runnerVerified: value }),
        15000,
        "Save bag confirmation",
      );
      patchActiveOrder(orderId, { runnerVerified: value });
    } catch (err) {
      console.error("Bag confirmation save failed", err);
      setDeliverError(
        err instanceof Error
          ? err.message
          : "Could not save confirmation. Please try again.",
      );
    }
  }

  function handleFinalTotalChange(orderId: string, value: string) {
    setFinalTotals((prev) => ({ ...prev, [orderId]: value }));
    if (finalTotalSaveTimer.current) clearTimeout(finalTotalSaveTimer.current);
    const amount = Number(value);
    if (!(amount > 0)) return;
    finalTotalSaveTimer.current = setTimeout(() => {
      void (async () => {
        setUploading("total");
        setDeliverError("");
        try {
          await withTimeout(
            saveRunnerDeliveryProgress(orderId, { finalTotal: amount }),
            15000,
            "Save final total",
          );
          patchActiveOrder(orderId, { finalTotal: amount });
        } catch (err) {
          console.error("Final total save failed", err);
          setDeliverError(
            err instanceof Error
              ? err.message
              : "Could not save total. Please try again.",
          );
        } finally {
          setUploading("");
        }
      })();
    }, 500);
  }

  async function handleDelivered(orderId: string): Promise<boolean> {
    const order = orderWithProgress(orderId);
    const file = photoFiles[orderId];
    const bank = bankFiles[orderId];
    const receipt = receiptFiles[orderId];
    const finalTotal = Number(finalTotals[orderId] || order?.finalTotal);
    setDeliverError("");

    let receiptUrl = order?.receiptUrl;
    let bankStatementUrl = order?.bankStatementUrl;
    let deliveryPhotoUrl = order?.deliveryPhotoUrl;
    const verified = Boolean(bagConfirmed[orderId] || order?.runnerVerified);
    const store = supermarketForCampus(order?.campus);

    if (!receiptUrl && !receipt) {
      setDeliverError(`Upload the ${store} receipt photo.`);
      return false;
    }
    const cityuOrder = order?.campus === "cityu";
    if (!cityuOrder && !bankStatementUrl && !bank) {
      setDeliverError(`Upload a bank statement of the ${store} payment.`);
      return false;
    }
    if (!deliveryPhotoUrl && !file) {
      setDeliverError("A lobby photo is required before you mark delivered.");
      return false;
    }
    if (!(finalTotal > 0)) {
      setDeliverError(`Enter the final ${store} receipt total before marking delivered.`);
      return false;
    }
    if (!verified) {
      setDeliverError(
        "Confirm you wrote the customer's full name on the receipt and attached it to the bag.",
      );
      return false;
    }

    setPurchasingId(orderId);
    try {
      if (!receiptUrl && receipt) {
        const compressed = await withTimeout(
          compressImage(receipt),
          20000,
          "Receipt compress",
        );
        receiptUrl = await withTimeout(
          uploadReceiptPhoto(orderId, compressed),
          45000,
          "Receipt upload",
        );
        await saveRunnerDeliveryProgress(orderId, { receiptUrl });
        patchActiveOrder(orderId, { receiptUrl });
      }
      if (!bankStatementUrl && bank) {
        const compressed = await withTimeout(
          compressImage(bank),
          20000,
          "Bank compress",
        );
        bankStatementUrl = await withTimeout(
          uploadBankStatementPhoto(orderId, compressed),
          45000,
          "Bank statement upload",
        );
        await saveRunnerDeliveryProgress(orderId, { bankStatementUrl });
        patchActiveOrder(orderId, { bankStatementUrl });
      }
      if (!deliveryPhotoUrl && file) {
        const compressed = await withTimeout(
          compressImage(file),
          20000,
          "Photo compress",
        );
        deliveryPhotoUrl = await withTimeout(
          uploadDeliveryPhoto(orderId, compressed),
          45000,
          "Lobby photo upload",
        );
        await saveRunnerDeliveryProgress(orderId, { deliveryPhotoUrl });
        patchActiveOrder(orderId, { deliveryPhotoUrl });
      }

      if (!receiptUrl || (!cityuOrder && !bankStatementUrl) || !deliveryPhotoUrl) {
        setDeliverError("Missing proof photos. Re-upload and try again.");
        return false;
      }

      if (cityuOrder) {
        const { postOrderTransition } = await import("@/lib/order-transition");
        if (order?.status !== "receipt_uploaded") {
          await postOrderTransition({
            orderId,
            to: "receipt_uploaded",
            receiptUrl,
            receiptAmount: finalTotal,
          });
        }
        await postOrderTransition({
          orderId,
          to: "delivered",
          receiptUrl,
          dropoffPhotoUrl: deliveryPhotoUrl,
        });
      } else {
        await withTimeout(
          markDeliveredWithTotal(orderId, {
            finalTotal,
            deliveryPhotoUrl,
            bankStatementUrl: bankStatementUrl ?? "",
            receiptUrl,
            runnerVerified: true,
          }),
          20000,
          "Mark delivered",
        );
      }

      if (order) {
        const owner = ownerPaymentDetails();
        const runnerPay = [
          order.runnerPaymentMethod ?? user?.runnerPaymentMethod ?? "",
          order.runnerPaymentId ?? user?.runnerPaymentId ?? "",
        ]
          .filter(Boolean)
          .join(" ");
        void notifyOrderStatus({
          customerEmail: order.customerEmail,
          orderId,
          status: "delivered",
          customerName: order.customerName,
          total: customerAmountDue({
            ...order,
            finalTotal,
            amountPaidByRunner: finalTotal,
          }),
          paymentInfo:
            runnerPay ||
            (owner.id ? `${owner.method} ${owner.id}` : user?.phone ?? ""),
        });
      }
      delete progressRef.current[orderId];
      setFlowOrderId(null);
      void refresh();
      return true;
    } catch (err) {
      console.error("Mark delivered failed", err);
      setDeliverError(
        err instanceof Error ? err.message : "Could not mark as delivered.",
      );
      return false;
    } finally {
      setPurchasingId("");
    }
  }

  async function handleCanteenPickedUp(orderId: string): Promise<boolean> {
    const order = orderWithProgress(orderId);
    if (!order) return false;
    if (order.status === "purchased" || order.status === "delivered") return true;
    setPurchasingId(orderId);
    setDeliverError("");
    try {
      await withTimeout(markCanteenPickedUp(orderId), 15000, "Mark picked up");
      patchActiveOrder(orderId, { status: "purchased" });
      void notifyCanteenEvent({ orderId, event: "picked_up" });
      void refresh();
      return true;
    } catch (err) {
      console.error("Canteen pick up failed", err);
      setDeliverError(
        err instanceof Error ? err.message : "Could not mark as picked up.",
      );
      return false;
    } finally {
      setPurchasingId("");
    }
  }

  async function handleCanteenDelivered(orderId: string): Promise<boolean> {
    const order = orderWithProgress(orderId);
    if (!order) return false;
    setDeliverError("");
    let deliveryPhotoUrl =
      order.deliveryPhotoUrl ?? progressRef.current[orderId]?.deliveryPhotoUrl;
    const file = photoFiles[orderId];
    if (!deliveryPhotoUrl && !file) {
      setDeliverError("A lobby photo is required before you mark delivered.");
      return false;
    }

    setPurchasingId(orderId);
    try {
      if (!deliveryPhotoUrl && file) {
        const compressed = await withTimeout(
          compressImage(file),
          20000,
          "Photo compress",
        );
        deliveryPhotoUrl = await withTimeout(
          uploadDeliveryPhoto(orderId, compressed),
          45000,
          "Lobby photo upload",
        );
        await saveRunnerDeliveryProgress(orderId, { deliveryPhotoUrl });
        patchActiveOrder(orderId, { deliveryPhotoUrl });
      }
      if (!deliveryPhotoUrl) {
        setDeliverError("Missing lobby photo. Re-upload and try again.");
        return false;
      }

      const finalTotal = order.subtotal;
      await withTimeout(
        markCanteenDelivered(orderId, {
          finalTotal,
          deliveryPhotoUrl,
        }),
        20000,
        "Mark delivered",
      );

      const owner = ownerPaymentDetails();
      const runnerPay = [
        order.runnerPaymentMethod ?? user?.runnerPaymentMethod ?? "",
        order.runnerPaymentId ?? user?.runnerPaymentId ?? "",
      ]
        .filter(Boolean)
        .join(" ");
      void notifyOrderStatus({
        customerEmail: order.customerEmail,
        orderId,
        status: "delivered",
        customerName: order.customerName,
        total: customerAmountDue({
          ...order,
          finalTotal,
          amountPaidByRunner: finalTotal,
        }),
        paymentInfo:
          runnerPay ||
          (owner.id ? `${owner.method} ${owner.id}` : user?.phone ?? ""),
      });
      delete progressRef.current[orderId];
      setFlowOrderId(null);
      void refresh();
      return true;
    } catch (err) {
      console.error("Canteen deliver failed", err);
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

  const weekStart = startOfWeekHkMs(now);
  const weekDelivered = delivered.filter((order) => {
    const stamp = order.deliveredAt ?? order.updatedAt;
    return stamp.getTime() >= weekStart;
  });
  const weekEarned = weekDelivered.reduce(
    (sum, order) => sum + runnerEarningsForOrder(order.deliveryFee),
    0,
  );

  return (
    <RequireRunner>
      <AppShell hideNav={scope === "cityu"}>
        <LakersWallpaper>
          <AppHeader title="Runner Dashboard" />

          <main
            className={`mx-auto px-4 py-4 ${
              pane === "deliveries" ? "max-w-[480px] lg:max-w-5xl" : "max-w-[480px]"
            }`}
          >
            <div
              role="tablist"
              aria-label="Runner dashboard"
              className="relative z-20 grid grid-cols-2 gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-200 sm:grid-cols-4"
            >
              {nav.map((item) => (
                <button
                  key={item.view}
                  type="button"
                  role="tab"
                  aria-selected={pane === item.view}
                  onClick={() => {
                    setPane(item.view);
                    if (pathname !== item.href) router.push(item.href);
                  }}
                  className={`rounded-lg px-1 py-2.5 text-center text-xs font-semibold leading-tight transition-colors ${
                    pane === item.view
                      ? "bg-[#ED1C24] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                  {item.view === "expired" && expiredDeliveries.length > 0
                    ? ` (${expiredDeliveries.length})`
                    : ""}
                </button>
              ))}
            </div>

            {loadError && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError}
              </p>
            )}

            {loading && (
              <p className="mt-4 text-sm text-gray-500">Loading…</p>
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
                        runnerCollege={
                          runnerProfile?.college || user?.college
                        }
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
                <div className="mb-3">
                  <AdminSupportChat embedded />
                </div>
                {deliverError && (
                  <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {deliverError}
                  </p>
                )}
                {openDeliveries.length === 0 ? (
                  <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
                    <p className="text-sm text-gray-600">You have no active deliveries.</p>
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
                        <div className="mt-2">
                          <CollegeDiscountRunnerBadge
                            order={order}
                            runnerCollege={
                              order.runnerCollege ||
                              runnerProfile?.college ||
                              user?.college
                            }
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDeliverError("");
                            setFlowOrderId(order.id);
                          }}
                          className="mt-3 min-h-12 w-full rounded-xl bg-[#ED1C24] text-sm font-bold text-white"
                        >
                          {order.status === "purchased"
                            ? "Continue delivery"
                            : resolveOrderChannel(order) === "canteen"
                              ? "Pick up order"
                              : "Start order"}
                        </button>
                        <Link
                          href={
                            orderCampus(order) === "cityu"
                              ? `/cityu/chat/${order.id}`
                              : `/chat/${order.id}`
                          }
                          className="mt-2 flex min-h-11 items-center justify-center rounded-xl border border-[#ED1C24] text-sm font-semibold text-[#ED1C24]"
                        >
                          Chat with customer
                        </Link>
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
                <div className="rounded-2xl bg-[#ED1C24] p-5 text-white shadow-md">
                  <p className="text-sm text-white/80">Earned this week</p>
                  <p className="mt-1 text-3xl font-bold">
                    ${weekEarned}
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
      {flowOrder &&
        (resolveOrderChannel(flowOrder) === "canteen" ? (
          <CanteenDeliveryFlow
            order={orderWithProgress(flowOrder.id) ?? flowOrder}
            runnerCollege={runnerProfile?.college || user?.college}
            photoFile={photoFiles[flowOrder.id]}
            busy={purchasingId === flowOrder.id}
            uploading={uploading === "photo" ? "photo" : ""}
            error={deliverError}
            onPhoto={(file) => void handleLobbyUpload(flowOrder.id, file)}
            onPickedUp={() => handleCanteenPickedUp(flowOrder.id)}
            onDelivered={() => handleCanteenDelivered(flowOrder.id)}
            onClose={() => {
              setDeliverError("");
              setFlowOrderId(null);
            }}
          />
        ) : (
          <RunnerDeliveryFlow
            order={orderWithProgress(flowOrder.id) ?? flowOrder}
            receiptFile={receiptFiles[flowOrder.id]}
            bankFile={bankFiles[flowOrder.id]}
            photoFile={photoFiles[flowOrder.id]}
            finalTotal={
              finalTotals[flowOrder.id] ??
              (flowOrder.finalTotal != null ? String(flowOrder.finalTotal) : "")
            }
            bagConfirmed={Boolean(
              bagConfirmed[flowOrder.id] || flowOrder.runnerVerified,
            )}
            busy={purchasingId === flowOrder.id}
            uploading={uploading}
            error={deliverError}
            onReceipt={(file) => void handleReceiptUpload(flowOrder.id, file)}
            onBank={(file) => void handleBankUpload(flowOrder.id, file)}
            onPhoto={(file) => void handleLobbyUpload(flowOrder.id, file)}
            onFinalTotal={(value) => handleFinalTotalChange(flowOrder.id, value)}
            onBagConfirmed={(value) =>
              void handleBagConfirmed(flowOrder.id, value)
            }
            onDelivered={() => handleDelivered(flowOrder.id)}
            onClose={() => {
              setDeliverError("");
              setFlowOrderId(null);
            }}
          />
        ))}
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
