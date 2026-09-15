import {
  addMockOrder,
  getMockActiveOrders,
  getMockOrderById,
  getMockPendingOrders,
  getMockRunnerOrders,
} from "./mock-orders";
import { collectionName, isStagingApp, storagePath } from "./app-env";
import {
  isOverOrderLimit,
  ORDER_LIMIT_MESSAGE,
  resolveSpecialInstructions,
} from "./constants";
import type { Order, OrderItem, OrderStatus, PriceAdjustmentStatus } from "./types";
import {
  ACTIVE_ORDER_LIMIT_MESSAGE,
  CUSTOMER_DEADLINE_REMINDER_MS,
  CUSTOMER_PAY_WINDOW_MS,
  customerDeadlineOf,
  isActiveCustomerOrderStatus,
  isCustomerPaymentOpen,
  isRunnerDeliveryOpen,
  MAX_ACTIVE_CUSTOMER_ORDERS,
  normalizeOrderStatus,
  RUNNER_DEADLINE_REMINDER_MS,
  RUNNER_DELIVERY_WINDOW_MS,
  runnerDeadlineOf,
} from "./order-status";
import { omitUndefined } from "./omit-undefined";
import { getDb, getFirebaseStorage, isFirebaseConfigured } from "./firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const ORDERS_COLLECTION = collectionName("orders");
const ORDER_HISTORY_KEY = isStagingApp()
  ? "fusion_order_history_test"
  : "fusion_order_history";
let memoryHistoryIds: string[] = [];

function readHistoryIds(): string[] {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(ORDER_HISTORY_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    }
  } catch {
    // use memory
  }
  return memoryHistoryIds;
}

function writeHistoryIds(ids: string[]): void {
  memoryHistoryIds = ids;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(ids));
    }
  } catch {
    // memory only (React Native)
  }
}

export function saveOrderToHistory(orderId: string): void {
  const ids = readHistoryIds();
  if (!ids.includes(orderId)) {
    writeHistoryIds([orderId, ...ids].slice(0, 50));
  }
}

export function getOrderHistoryIds(): string[] {
  return readHistoryIds();
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as Timestamp).toDate();
  }
  return new Date(String(value));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseItems(raw: unknown): Order["items"] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      itemId: String(row.itemId ?? ""),
      name: String(row.name ?? ""),
      price: Number(row.price ?? 0),
      quantity: Number(row.quantity ?? 0),
      weightKg: row.weightKg != null ? Number(row.weightKg) : undefined,
      actualPrice: row.actualPrice != null ? Number(row.actualPrice) : undefined,
    };
  });
}

function parseOrder(id: string, data: Record<string, unknown>): Order {
  const loc = data.runnerLocation as Record<string, unknown> | undefined;
  return {
    id,
    sessionId: String(data.sessionId ?? ""),
    customerId: String(data.customerId ?? data.sessionId ?? ""),
    customerName: data.customerName ? String(data.customerName) : undefined,
    customerEmail: data.customerEmail ? String(data.customerEmail) : undefined,
    items: parseItems(data.items),
    status: normalizeOrderStatus(String(data.status ?? "pending")),
    college: String(data.college ?? ""),
    hall: String(data.hall ?? ""),
    roomNumber: data.roomNumber ? String(data.roomNumber) : undefined,
    lobbyPoint: String(data.lobbyPoint ?? ""),
    zone: (() => {
      const z = Number(data.zone);
      return z === 1 || z === 2 || z === 3 ? z : undefined;
    })(),
    totalWeight: data.totalWeight != null ? Number(data.totalWeight) : undefined,
    customerNote: data.customerNote ? String(data.customerNote) : undefined,
    runnerNote: data.runnerNote ? String(data.runnerNote) : undefined,
    subtotal: Number(data.subtotal ?? 0),
    deliveryFee: Number(data.deliveryFee ?? 10),
    tip: data.tip != null ? Number(data.tip) : undefined,
    total: Number(data.total ?? 0),
    paymentReceived: Boolean(data.paymentReceived),
    paymentMethod: data.paymentMethod as Order["paymentMethod"],
    finalTotal: data.finalTotal != null ? Number(data.finalTotal) : undefined,
    amountPaidByRunner:
      data.amountPaidByRunner != null
        ? Number(data.amountPaidByRunner)
        : data.finalTotal != null
          ? Number(data.finalTotal)
          : undefined,
    receiptUrl: data.receiptUrl ? String(data.receiptUrl) : undefined,
    bankStatementUrl: data.bankStatementUrl
      ? String(data.bankStatementUrl)
      : undefined,
    customerNameOnReceipt: Boolean(data.customerNameOnReceipt),
    runnerVerified: Boolean(data.runnerVerified),
    adminVerified: Boolean(data.adminVerified),
    customerPaidAt: data.customerPaidAt ? toDate(data.customerPaidAt) : undefined,
    runnerPaidAt: data.runnerPaidAt ? toDate(data.runnerPaidAt) : undefined,
    runnerEmail: data.runnerEmail ? String(data.runnerEmail) : undefined,
    acceptedAt: data.acceptedAt ? toDate(data.acceptedAt) : undefined,
    purchasedAt: data.purchasedAt
      ? toDate(data.purchasedAt)
      : data.pickedUpAt
        ? toDate(data.pickedUpAt)
        : undefined,
    runnerPaymentMethod: data.runnerPaymentMethod as Order["runnerPaymentMethod"],
    runnerPaymentId: data.runnerPaymentId
      ? String(data.runnerPaymentId)
      : undefined,
    runnerId: data.runnerId ? String(data.runnerId) : undefined,
    runnerUid: data.runnerUid ? String(data.runnerUid) : undefined,
    runnerName: data.runnerName ? String(data.runnerName) : undefined,
    runnerRating: data.runnerRating != null ? Number(data.runnerRating) : undefined,
    deliveryPhotoUrl: data.deliveryPhotoUrl
      ? String(data.deliveryPhotoUrl)
      : undefined,
    estimatedDeliveryAt: data.estimatedDeliveryAt
      ? toDate(data.estimatedDeliveryAt)
      : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    pickedUpAt: data.pickedUpAt ? toDate(data.pickedUpAt) : undefined,
    deliveredAt: data.deliveredAt ? toDate(data.deliveredAt) : undefined,
    runnerDeadline: data.runnerDeadline ? toDate(data.runnerDeadline) : undefined,
    customerDeadline: data.customerDeadline
      ? toDate(data.customerDeadline)
      : undefined,
    runnerWarningCount:
      data.runnerWarningCount != null ? Number(data.runnerWarningCount) : undefined,
    customerWarningCount:
      data.customerWarningCount != null
        ? Number(data.customerWarningCount)
        : undefined,
    runnerExpiredAt: data.runnerExpiredAt
      ? toDate(data.runnerExpiredAt)
      : undefined,
    customerOverdueAt: data.customerOverdueAt
      ? toDate(data.customerOverdueAt)
      : undefined,
    runnerReminderSentAt: data.runnerReminderSentAt
      ? toDate(data.runnerReminderSentAt)
      : undefined,
    customerReminderSentAt: data.customerReminderSentAt
      ? toDate(data.customerReminderSentAt)
      : undefined,
    adminMissedNotifiedAt: data.adminMissedNotifiedAt
      ? toDate(data.adminMissedNotifiedAt)
      : undefined,
    lastEscalatedAt: data.lastEscalatedAt
      ? toDate(data.lastEscalatedAt)
      : undefined,
    estimatedSubtotal:
      data.estimatedSubtotal != null ? Number(data.estimatedSubtotal) : undefined,
    actualSubtotal:
      data.actualSubtotal != null ? Number(data.actualSubtotal) : undefined,
    priceDifference:
      data.priceDifference != null ? Number(data.priceDifference) : undefined,
    priceAdjustmentStatus: data.priceAdjustmentStatus as
      | PriceAdjustmentStatus
      | undefined,
    refundAmount: data.refundAmount != null ? Number(data.refundAmount) : undefined,
    refundedAt: data.refundedAt ? toDate(data.refundedAt) : undefined,
    tillPricesSubmittedAt: data.tillPricesSubmittedAt
      ? toDate(data.tillPricesSubmittedAt)
      : undefined,
    customerApprovedPriceAt: data.customerApprovedPriceAt
      ? toDate(data.customerApprovedPriceAt)
      : undefined,
    fusionPaidByPlatform: data.fusionPaidByPlatform !== false,
    runnerLocation:
      loc && typeof loc.lat === "number" && typeof loc.lng === "number"
        ? {
            lat: Number(loc.lat),
            lng: Number(loc.lng),
            updatedAt: loc.updatedAt ? toDate(loc.updatedAt) : new Date(),
          }
        : undefined,
  };
}

export function orderActualSubtotal(items: OrderItem[]): number {
  return round2(
    items.reduce(
      (sum, item) => sum + (item.actualPrice ?? item.price) * item.quantity,
      0,
    ),
  );
}

export function orderGrandTotal(
  subtotal: number,
  deliveryFee: number,
  tip = 0,
): number {
  return round2(subtotal + deliveryFee + tip);
}

export async function createOrder(
  order: Omit<Order, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  if (isOverOrderLimit(order.subtotal)) {
    throw new Error(ORDER_LIMIT_MESSAGE);
  }
  if (order.customerId) {
    const active = await fetchActiveCustomerOrders(order.customerId);
    if (active.length >= MAX_ACTIVE_CUSTOMER_ORDERS) {
      throw new Error(ACTIVE_ORDER_LIMIT_MESSAGE);
    }
  }
  const now = new Date();
  const id = `FE-${Math.floor(1000 + Math.random() * 9000)}`;
  const orderWithNotes = {
    ...order,
    customerNote: resolveSpecialInstructions(order.customerNote),
  };

  if (isFirebaseConfigured()) {
    try {
      const payload = omitUndefined({
        ...orderWithNotes,
        status: "pending",
        fusionPaidByPlatform: true,
        estimatedSubtotal: order.estimatedSubtotal ?? order.subtotal,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        estimatedDeliveryAt: order.estimatedDeliveryAt
          ? Timestamp.fromDate(order.estimatedDeliveryAt)
          : undefined,
      } as Record<string, unknown>);
      const ref = await addDoc(collection(getDb(), ORDERS_COLLECTION), payload);
      return ref.id;
    } catch (err) {
      console.error("createOrder Firestore failed", err);
      throw err instanceof Error
        ? err
        : new Error("Could not save order. Try again.");
    }
  }

  const fullOrder: Order = {
    ...orderWithNotes,
    id,
    status: "pending",
    fusionPaidByPlatform: true,
    estimatedSubtotal: order.estimatedSubtotal ?? order.subtotal,
    createdAt: now,
    updatedAt: now,
  };
  addMockOrder(fullOrder);
  saveOrderToHistory(id);
  return id;
}

export async function fetchOrder(orderId: string): Promise<Order | null> {
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDoc(doc(getDb(), ORDERS_COLLECTION, orderId));
      if (snap.exists()) {
        return parseOrder(snap.id, snap.data() as Record<string, unknown>);
      }
    } catch {
      // fallback
    }
  }

  return getMockOrderById(orderId) ?? null;
}

export class SelfPickupError extends Error {
  constructor() {
    super("You cannot pick up your own order.");
    this.name = "SelfPickupError";
  }
}

export class OrderAlreadyTakenError extends Error {
  constructor() {
    super("This order was already accepted by another runner.");
    this.name = "OrderAlreadyTakenError";
  }
}

function filterOwnOrders(orders: Order[], excludeCustomerId?: string): Order[] {
  if (!excludeCustomerId) return orders;
  return orders.filter((o) => o.customerId !== excludeCustomerId);
}

const ORDER_PAGE_SIZE = 100;

function parseSnapshotDocs(
  docs: { id: string; data: () => unknown }[],
): Order[] {
  return docs.map((d) =>
    parseOrder(d.id, d.data() as Record<string, unknown>),
  );
}

function byNewestFirst(a: Order, b: Order): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

/**
 * Security rules only allow queries they can prove are scoped, so every read
 * below filters on the field the matching `list` rule checks. Widening one of
 * these queries without updating firestore.rules will fail with
 * "Missing or insufficient permissions".
 */
export async function fetchPendingOrders(
  excludeCustomerId?: string,
): Promise<Order[]> {
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(
        query(
          collection(getDb(), ORDERS_COLLECTION),
          where("status", "==", "pending"),
          orderBy("createdAt", "desc"),
          limit(ORDER_PAGE_SIZE),
        ),
      );
      return filterOwnOrders(parseSnapshotDocs(snap.docs), excludeCustomerId);
    } catch (err) {
      console.error("fetchPendingOrders Firestore failed", err);
      throw err instanceof Error
        ? err
        : new Error("Could not load available orders.");
    }
  }

  return filterOwnOrders(getMockPendingOrders(), excludeCustomerId);
}

/** Order history for the signed-in customer, keyed on their auth uid. */
export async function fetchOrdersByCustomer(
  customerId: string,
): Promise<Order[]> {
  if (!customerId) return [];
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(
        query(
          collection(getDb(), ORDERS_COLLECTION),
          where("customerId", "==", customerId),
          orderBy("createdAt", "desc"),
          limit(ORDER_PAGE_SIZE),
        ),
      );
      return parseSnapshotDocs(snap.docs);
    } catch (err) {
      console.error("fetchOrdersByCustomer Firestore failed", err);
      throw err instanceof Error
        ? err
        : new Error("Could not load your orders.");
    }
  }

  return [];
}

export async function fetchActiveCustomerOrders(
  customerId: string,
): Promise<Order[]> {
  const orders = await fetchOrdersByCustomer(customerId);
  return orders.filter((order) => isActiveCustomerOrderStatus(order.status));
}

export async function fetchRunnerOrders(runnerUid: string): Promise<Order[]> {
  if (!runnerUid) return [];
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(
        query(
          collection(getDb(), ORDERS_COLLECTION),
          where("runnerUid", "==", runnerUid),
          where("status", "in", ["accepted", "purchased", "assigned", "picked"]),
        ),
      );
      return parseSnapshotDocs(snap.docs).sort(byNewestFirst);
    } catch (err) {
      console.error("fetchRunnerOrders Firestore failed", err);
      throw err instanceof Error
        ? err
        : new Error("Could not load your active orders.");
    }
  }

  return getMockRunnerOrders(runnerUid);
}

export async function fetchDeliveredOrdersByRunner(
  runnerUid: string,
): Promise<Order[]> {
  if (!runnerUid) return [];
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(
        query(
          collection(getDb(), ORDERS_COLLECTION),
          where("runnerUid", "==", runnerUid),
          where("status", "in", ["delivered", "runner_paid", "customer_paid", "paid", "completed"]),
          limit(ORDER_PAGE_SIZE),
        ),
      );
      return parseSnapshotDocs(snap.docs).sort(byNewestFirst);
    } catch (err) {
      console.error("fetchDeliveredOrdersByRunner Firestore failed", err);
      throw err instanceof Error
        ? err
        : new Error("Could not load completed deliveries.");
    }
  }

  return getMockRunnerOrders(runnerUid, true);
}

/**
 * @param runnerId doc id in /runners
 * @param runnerUid auth uid of the runner; stored so security rules and the
 *   runner's own order queries can match on request.auth.uid
 */
export async function acceptOrder(
  orderId: string,
  runnerId: string,
  runnerName: string,
  runnerUid: string,
  payment?: { method: "PayMe" | "FPS"; id: string; email?: string },
): Promise<void> {
  const now = new Date();
  const paymentFields = omitUndefined({
    runnerPaymentMethod: payment?.method,
    runnerPaymentId: payment?.id,
    runnerEmail: payment?.email,
  });
  if (isFirebaseConfigured()) {
    const db = getDb();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists()) throw new Error("Order not found");
      const order = parseOrder(snap.id, snap.data() as Record<string, unknown>);
      if (order.customerId === runnerUid) {
        throw new SelfPickupError();
      }
      if (order.status !== "pending") {
        if (order.runnerUid === runnerUid || order.runnerId === runnerId) return;
        throw new OrderAlreadyTakenError();
      }
      tx.update(orderRef, {
        status: "accepted",
        runnerId,
        runnerUid,
        runnerName,
        acceptedAt: Timestamp.fromDate(now),
        runnerDeadline: Timestamp.fromDate(
          new Date(now.getTime() + RUNNER_DELIVERY_WINDOW_MS),
        ),
        updatedAt: Timestamp.fromDate(now),
        ...paymentFields,
      });
    });
    return;
  }

  const order = await fetchOrder(orderId);
  if (!order) throw new Error("Order not found");
  if (order.customerId === runnerUid) {
    throw new SelfPickupError();
  }
  if (order.status !== "pending") {
    if (order.runnerUid === runnerUid || order.runnerId === runnerId) return;
    throw new OrderAlreadyTakenError();
  }
  await updateOrderStatus(orderId, "accepted", {
    runnerId,
    runnerUid,
    runnerName,
    runnerPaymentMethod: payment?.method,
    runnerPaymentId: payment?.id,
    runnerEmail: payment?.email,
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  extras?: Partial<
    Pick<
      Order,
      | "runnerName"
      | "runnerId"
      | "runnerUid"
      | "deliveryPhotoUrl"
      | "receiptUrl"
      | "bankStatementUrl"
      | "finalTotal"
      | "amountPaidByRunner"
      | "runnerVerified"
      | "runnerPaymentMethod"
      | "runnerPaymentId"
      | "runnerEmail"
    >
  >,
): Promise<void> {
  const now = new Date();

  if (isFirebaseConfigured()) {
    try {
      const updates: Record<string, unknown> = {
        status,
        updatedAt: Timestamp.fromDate(now),
      };
      if (status === "accepted") {
        updates.acceptedAt = Timestamp.fromDate(now);
        updates.runnerDeadline = Timestamp.fromDate(
          new Date(now.getTime() + RUNNER_DELIVERY_WINDOW_MS),
        );
      }
      if (status === "purchased") {
        updates.purchasedAt = Timestamp.fromDate(now);
        updates.pickedUpAt = Timestamp.fromDate(now);
      }
      if (status === "delivered") {
        updates.deliveredAt = Timestamp.fromDate(now);
        updates.customerDeadline = Timestamp.fromDate(
          new Date(now.getTime() + CUSTOMER_PAY_WINDOW_MS),
        );
      }
      if (status === "customer_paid") {
        updates.customerPaidAt = Timestamp.fromDate(now);
        updates.paymentReceived = true;
      }
      if (status === "runner_paid") {
        updates.runnerPaidAt = Timestamp.fromDate(now);
      }
      if (extras?.runnerName) updates.runnerName = extras.runnerName;
      if (extras?.runnerId) updates.runnerId = extras.runnerId;
      if (extras?.runnerUid) updates.runnerUid = extras.runnerUid;
      if (extras?.deliveryPhotoUrl) {
        updates.deliveryPhotoUrl = extras.deliveryPhotoUrl;
      }
      if (extras?.receiptUrl) updates.receiptUrl = extras.receiptUrl;
      if (extras?.bankStatementUrl) updates.bankStatementUrl = extras.bankStatementUrl;
      if (extras?.finalTotal != null) updates.finalTotal = extras.finalTotal;
      if (extras?.amountPaidByRunner != null) {
        updates.amountPaidByRunner = extras.amountPaidByRunner;
      }
      if (extras?.runnerVerified != null) updates.runnerVerified = extras.runnerVerified;
      if (extras?.runnerEmail) updates.runnerEmail = extras.runnerEmail;
      if (extras?.runnerPaymentMethod) {
        updates.runnerPaymentMethod = extras.runnerPaymentMethod;
      }
      if (extras?.runnerPaymentId) {
        updates.runnerPaymentId = extras.runnerPaymentId;
      }
      await updateDoc(doc(getDb(), ORDERS_COLLECTION, orderId), omitUndefined(updates));
      return;
    } catch (err) {
      console.error("updateOrderStatus Firestore failed", err);
      throw err instanceof Error
        ? err
        : new Error("Could not update the order. Try again.");
    }
  }

  const order = getMockOrderById(orderId);
  if (order) {
    order.status = status;
    order.updatedAt = now;
    if (status === "accepted") order.acceptedAt = now;
    if (status === "purchased") {
      order.purchasedAt = now;
      order.pickedUpAt = now;
    }
    if (status === "delivered") order.deliveredAt = now;
    if (status === "customer_paid") {
      order.customerPaidAt = now;
      order.paymentReceived = true;
    }
    if (status === "runner_paid") order.runnerPaidAt = now;
    if (extras?.runnerName) order.runnerName = extras.runnerName;
    if (extras?.runnerId) order.runnerId = extras.runnerId;
    if (extras?.runnerUid) order.runnerUid = extras.runnerUid;
    if (extras?.deliveryPhotoUrl) order.deliveryPhotoUrl = extras.deliveryPhotoUrl;
    if (extras?.receiptUrl) order.receiptUrl = extras.receiptUrl;
    if (extras?.bankStatementUrl) order.bankStatementUrl = extras.bankStatementUrl;
    if (extras?.finalTotal != null) order.finalTotal = extras.finalTotal;
    if (extras?.amountPaidByRunner != null) {
      order.amountPaidByRunner = extras.amountPaidByRunner;
    }
    if (extras?.runnerVerified != null) order.runnerVerified = extras.runnerVerified;
    if (extras?.runnerEmail) order.runnerEmail = extras.runnerEmail;
    if (extras?.runnerPaymentMethod) {
      order.runnerPaymentMethod = extras.runnerPaymentMethod;
    }
    if (extras?.runnerPaymentId) order.runnerPaymentId = extras.runnerPaymentId;
  }
}

export async function uploadDeliveryPhoto(
  orderId: string,
  file: Blob,
  filename = "proof.jpg",
): Promise<string> {
  const name =
    "name" in file && typeof (file as { name?: string }).name === "string"
      ? (file as { name: string }).name
      : filename;
  if (isFirebaseConfigured()) {
    try {
      const storageRef = ref(
        getFirebaseStorage(),
        storagePath(`delivery-proofs/${orderId}/${name}`),
      );
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch {
      // fallback
    }
  }

  return `mock://delivery/${orderId}/${name}`;
}

export async function fetchOrdersByIds(ids: string[]): Promise<Order[]> {
  const orders = await Promise.all(ids.map((id) => fetchOrder(id)));
  return orders.filter((o): o is Order => o !== null);
}

/** @deprecated use fetchRunnerOrders */
export async function fetchActiveOrders(): Promise<Order[]> {
  return getMockActiveOrders();
}

export async function cancelOrder(orderId: string, customerId: string): Promise<void> {
  const order = await fetchOrder(orderId);
  if (!order) throw new Error("Order not found");
  if (order.customerId !== customerId) throw new Error("Not authorized");
  const canCancelPending = order.status === "pending";
  const canCancelPriceIncrease =
    order.priceAdjustmentStatus === "pending_customer" &&
    (order.status === "accepted" || order.status === "pending");
  if (!canCancelPending && !canCancelPriceIncrease) {
    throw new Error("Order can only be cancelled before pickup");
  }
  await updateOrderStatus(orderId, "cancelled");
}

export async function updateOrderRating(
  orderId: string,
  rating: number,
): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      await updateDoc(doc(getDb(), ORDERS_COLLECTION, orderId), {
        runnerRating: rating,
        updatedAt: Timestamp.fromDate(new Date()),
      });
      return;
    } catch {
      // fallback
    }
  }
  const order = getMockOrderById(orderId);
  if (order) order.runnerRating = rating;
}

export async function updateRunnerNote(
  orderId: string,
  runnerNote: string,
): Promise<void> {
  const now = new Date();
  if (isFirebaseConfigured()) {
    try {
      await updateDoc(doc(getDb(), ORDERS_COLLECTION, orderId), {
        runnerNote,
        updatedAt: Timestamp.fromDate(now),
      });
      return;
    } catch {
      // fallback
    }
  }
  const order = getMockOrderById(orderId);
  if (order) {
    order.runnerNote = runnerNote;
    order.updatedAt = now;
  }
}

export async function countRunnerActiveOrders(
  runnerUid: string,
): Promise<number> {
  const orders = await fetchRunnerOrders(runnerUid);
  return orders.length;
}

async function patchOrder(
  orderId: string,
  updates: Record<string, unknown>,
  applyMock: (order: Order) => void,
): Promise<void> {
  const now = new Date();
  const withTime = {
    ...updates,
    updatedAt: Timestamp.fromDate(now),
  };
  if (isFirebaseConfigured()) {
    try {
      await updateDoc(
        doc(getDb(), ORDERS_COLLECTION, orderId),
        omitUndefined(withTime),
      );
      return;
    } catch {
      // fallback
    }
  }
  const order = getMockOrderById(orderId);
  if (order) {
    applyMock(order);
    order.updatedAt = now;
  }
}

export async function submitTillPrices(
  orderId: string,
  actualUnitPrices: Record<string, number>,
): Promise<Order | null> {
  const order = await fetchOrder(orderId);
  if (!order) throw new Error("Order not found");
  if (order.status !== "accepted") {
    throw new Error("Till prices can only be submitted before purchase");
  }

  const items = order.items.map((item) => {
    const actual = actualUnitPrices[item.itemId];
    if (actual == null || Number.isNaN(actual) || actual < 0) {
      throw new Error(`Enter the Fusion till price for ${item.name}`);
    }
    return { ...item, actualPrice: round2(actual) };
  });

  const estimatedSubtotal = order.estimatedSubtotal ?? order.subtotal;
  const actualSubtotal = orderActualSubtotal(items);
  const priceDifference = round2(actualSubtotal - estimatedSubtotal);
  const tip = order.tip ?? 0;
  const now = new Date();

  let priceAdjustmentStatus: PriceAdjustmentStatus = "none";
  let refundAmount: number | undefined;
  let subtotal = order.subtotal;
  let total = order.total;
  let status = order.status;

  if (priceDifference < 0) {
    subtotal = actualSubtotal;
    total = orderGrandTotal(actualSubtotal, order.deliveryFee, tip);
    if (order.paymentReceived) {
      priceAdjustmentStatus = "refund_pending";
      refundAmount = round2(-priceDifference);
    } else {
      priceAdjustmentStatus = "none";
      refundAmount = undefined;
    }
  } else if (priceDifference > 0) {
    priceAdjustmentStatus = "pending_customer";
  } else {
    subtotal = actualSubtotal;
    total = orderGrandTotal(actualSubtotal, order.deliveryFee, tip);
  }

  const firestoreUpdates: Record<string, unknown> = {
    items,
    estimatedSubtotal,
    actualSubtotal,
    priceDifference,
    priceAdjustmentStatus,
    refundAmount,
    subtotal,
    total,
    tillPricesSubmittedAt: Timestamp.fromDate(now),
    status,
  };

  await patchOrder(orderId, firestoreUpdates, (mock) => {
    mock.items = items;
    mock.estimatedSubtotal = estimatedSubtotal;
    mock.actualSubtotal = actualSubtotal;
    mock.priceDifference = priceDifference;
    mock.priceAdjustmentStatus = priceAdjustmentStatus;
    mock.refundAmount = refundAmount;
    mock.subtotal = subtotal;
    mock.total = total;
    mock.tillPricesSubmittedAt = now;
  });

  return fetchOrder(orderId);
}

export async function approvePriceIncrease(
  orderId: string,
  customerId: string,
): Promise<void> {
  const order = await fetchOrder(orderId);
  if (!order) throw new Error("Order not found");
  if (order.customerId !== customerId) throw new Error("Not authorized");
  if (order.priceAdjustmentStatus !== "pending_customer") {
    throw new Error("This order is not waiting for a price approval");
  }
  const actualSubtotal = order.actualSubtotal ?? orderActualSubtotal(order.items);
  const total = orderGrandTotal(actualSubtotal, order.deliveryFee, order.tip ?? 0);
  const now = new Date();
  await patchOrder(
    orderId,
    {
      subtotal: actualSubtotal,
      total,
      priceAdjustmentStatus: "approved",
      customerApprovedPriceAt: Timestamp.fromDate(now),
    },
    (mock) => {
      mock.subtotal = actualSubtotal;
      mock.total = total;
      mock.priceAdjustmentStatus = "approved";
      mock.customerApprovedPriceAt = now;
    },
  );
}

export async function updateRunnerLocation(
  orderId: string,
  lat: number,
  lng: number,
): Promise<void> {
  const now = new Date();
  await patchOrder(
    orderId,
    {
      runnerLocation: {
        lat,
        lng,
        updatedAt: Timestamp.fromDate(now),
      },
    },
    (mock) => {
      mock.runnerLocation = { lat, lng, updatedAt: now };
    },
  );
}

export async function markRefundComplete(orderId: string): Promise<void> {
  const now = new Date();
  await patchOrder(
    orderId,
    {
      priceAdjustmentStatus: "refunded",
      refundedAt: Timestamp.fromDate(now),
    },
    (mock) => {
      mock.priceAdjustmentStatus = "refunded";
      mock.refundedAt = now;
    },
  );
}

/** Admin-only: security rules reject this query for everyone else. */
export async function fetchOrdersNeedingRefund(): Promise<Order[]> {
  if (isFirebaseConfigured()) {
    const snap = await getDocs(
      query(
        collection(getDb(), ORDERS_COLLECTION),
        where("priceAdjustmentStatus", "==", "refund_pending"),
        limit(ORDER_PAGE_SIZE),
      ),
    );
    return parseSnapshotDocs(snap.docs).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }

  return [
    ...getMockPendingOrders(),
    ...getMockActiveOrders(),
    ...getMockRunnerOrders("demo-runner", true),
  ]
    .filter((o) => o.priceAdjustmentStatus === "refund_pending")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export function tillPricesReady(order: Order): boolean {
  return Boolean(order.tillPricesSubmittedAt);
}

export function awaitingCustomerPriceApproval(order: Order): boolean {
  return order.priceAdjustmentStatus === "pending_customer";
}

export function canMarkPickedUp(order: Order): boolean {
  return order.status === "accepted";
}

export async function uploadReceiptPhoto(
  orderId: string,
  file: Blob,
  filename = "receipt.jpg",
): Promise<string> {
  const name =
    "name" in file && typeof (file as { name?: string }).name === "string"
      ? (file as { name: string }).name
      : filename;
  if (isFirebaseConfigured()) {
    try {
      const storageRef = ref(
        getFirebaseStorage(),
        storagePath(`receipts/${orderId}/${name}`),
      );
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch {
      // fallback
    }
  }
  return `mock://receipt/${orderId}/${name}`;
}

export async function markPurchased(
  orderId: string,
  opts: { receiptUrl: string; bankStatementUrl?: string },
): Promise<void> {
  await updateOrderStatus(orderId, "purchased", {
    receiptUrl: opts.receiptUrl,
    bankStatementUrl: opts.bankStatementUrl,
  });
}

export async function uploadBankStatementPhoto(
  orderId: string,
  file: Blob,
  filename = "bank.jpg",
): Promise<string> {
  const name =
    "name" in file && typeof (file as { name?: string }).name === "string"
      ? (file as { name: string }).name
      : filename;
  if (isFirebaseConfigured()) {
    try {
      const storageRef = ref(
        getFirebaseStorage(),
        storagePath(`bank-statements/${orderId}/${name}`),
      );
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch {
      // fallback
    }
  }
  return `mock://bank/${orderId}/${name}`;
}

export async function markDeliveredWithTotal(
  orderId: string,
  opts: {
    finalTotal: number;
    deliveryPhotoUrl?: string;
    receiptUrl?: string;
    bankStatementUrl: string;
    runnerVerified: boolean;
  },
): Promise<void> {
  if (!(opts.finalTotal > 0)) {
    throw new Error("Enter the Fusion receipt total.");
  }
  if (!opts.bankStatementUrl) {
    throw new Error("Upload a bank statement screenshot.");
  }
  if (!opts.runnerVerified) {
    throw new Error("Confirm you wrote the customer's full name on the receipt.");
  }
  const amount = round2(opts.finalTotal);
  await updateOrderStatus(orderId, "delivered", {
    finalTotal: amount,
    amountPaidByRunner: amount,
    deliveryPhotoUrl: opts.deliveryPhotoUrl,
    receiptUrl: opts.receiptUrl,
    bankStatementUrl: opts.bankStatementUrl,
    runnerVerified: true,
  });
}

export async function markCustomerPaid(
  orderId: string,
  customerId: string,
): Promise<void> {
  const order = await fetchOrder(orderId);
  if (!order) throw new Error("Order not found");
  if (order.customerId !== customerId) throw new Error("Not authorized");
  if (order.status !== "delivered" && order.status !== "runner_paid") {
    throw new Error("You can mark paid after delivery.");
  }
  await updateOrderStatus(orderId, "customer_paid");
}

export async function verifyAdminDelivery(
  orderId: string,
  opts: { customerNameOnReceipt: boolean },
): Promise<void> {
  await patchOrder(
    orderId,
    {
      adminVerified: true,
      customerNameOnReceipt: opts.customerNameOnReceipt,
    },
    (mock) => {
      mock.adminVerified = true;
      mock.customerNameOnReceipt = opts.customerNameOnReceipt;
    },
  );
}

export async function markRunnerPayout(orderId: string): Promise<void> {
  const order = await fetchOrder(orderId);
  if (!order) throw new Error("Order not found");
  if (order.status !== "delivered") {
    throw new Error("Pay the runner after they mark delivered.");
  }
  await updateOrderStatus(orderId, "runner_paid");
}

export async function fetchOrdersAwaitingPayout(): Promise<Order[]> {
  return fetchAdminReviewOrders();
}

export async function fetchAdminReviewOrders(): Promise<Order[]> {
  if (isFirebaseConfigured()) {
    const snap = await getDocs(
      query(
        collection(getDb(), ORDERS_COLLECTION),
        where("status", "in", [
          "delivered",
          "runner_paid",
          "customer_paid",
          "paid",
          "completed",
        ]),
        limit(ORDER_PAGE_SIZE),
      ),
    );
    return parseSnapshotDocs(snap.docs).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }

  return [
    ...getMockPendingOrders(),
    ...getMockActiveOrders(),
    ...getMockRunnerOrders("demo-runner", true),
  ]
    .filter((order) =>
      ["delivered", "runner_paid", "customer_paid"].includes(order.status),
    )
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export type DeadlineSyncResult = {
  order: Order;
  runnerExpired: boolean;
  customerOverdue: boolean;
  runnerReminderDue: boolean;
  customerReminderDue: boolean;
  adminMissedDue: boolean;
};

export async function syncOrderDeadlines(order: Order): Promise<DeadlineSyncResult> {
  const now = new Date();
  const updates: Record<string, unknown> = {};
  const runnerDue = runnerDeadlineOf(order);
  const customerDue = customerDeadlineOf(order);
  let runnerExpired = Boolean(order.runnerExpiredAt);
  let customerOverdue = Boolean(order.customerOverdueAt);
  let runnerReminderDue = false;
  let customerReminderDue = false;
  let adminMissedDue = false;

  if (isRunnerDeliveryOpen(order.status) && runnerDue) {
    if (!order.runnerDeadline) updates.runnerDeadline = Timestamp.fromDate(runnerDue);
    if (now.getTime() >= runnerDue.getTime() && !order.runnerExpiredAt) {
      updates.runnerExpiredAt = Timestamp.fromDate(now);
      updates.runnerWarningCount = (order.runnerWarningCount ?? 0) + 1;
      runnerExpired = true;
    }
    if (
      !order.runnerReminderSentAt &&
      now.getTime() >= runnerDue.getTime() - RUNNER_DEADLINE_REMINDER_MS &&
      now.getTime() < runnerDue.getTime()
    ) {
      updates.runnerReminderSentAt = Timestamp.fromDate(now);
      runnerReminderDue = true;
    }
  }

  if (isCustomerPaymentOpen(order.status) && customerDue) {
    if (!order.customerDeadline) {
      updates.customerDeadline = Timestamp.fromDate(customerDue);
    }
    if (now.getTime() >= customerDue.getTime() && !order.customerOverdueAt) {
      updates.customerOverdueAt = Timestamp.fromDate(now);
      updates.customerWarningCount = (order.customerWarningCount ?? 0) + 1;
      customerOverdue = true;
    }
    if (
      !order.customerReminderSentAt &&
      now.getTime() >= customerDue.getTime() - CUSTOMER_DEADLINE_REMINDER_MS &&
      now.getTime() < customerDue.getTime()
    ) {
      updates.customerReminderSentAt = Timestamp.fromDate(now);
      customerReminderDue = true;
    }
  }

  if (
    !order.adminMissedNotifiedAt &&
    (updates.runnerExpiredAt || updates.customerOverdueAt)
  ) {
    updates.adminMissedNotifiedAt = Timestamp.fromDate(now);
    adminMissedDue = true;
  }

  if (Object.keys(updates).length > 0 && isFirebaseConfigured()) {
    updates.updatedAt = Timestamp.fromDate(now);
    try {
      await updateDoc(
        doc(getDb(), ORDERS_COLLECTION, order.id),
        omitUndefined(updates),
      );
    } catch (err) {
      console.error("syncOrderDeadlines failed", err);
    }
  }

  return {
    order,
    runnerExpired,
    customerOverdue,
    runnerReminderDue,
    customerReminderDue,
    adminMissedDue,
  };
}

export async function fetchDeadlineWatchOrders(): Promise<Order[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(
    query(
      collection(getDb(), ORDERS_COLLECTION),
      where("status", "in", [
        "accepted",
        "purchased",
        "assigned",
        "picked",
        "delivered",
        "runner_paid",
      ]),
      limit(ORDER_PAGE_SIZE),
    ),
  );
  return parseSnapshotDocs(snap.docs);
}

export async function escalateDeadlineWarning(
  orderId: string,
  party: "runner" | "customer",
): Promise<void> {
  const order = await fetchOrder(orderId);
  if (!order) throw new Error("Order not found");
  const now = new Date();
  const field = party === "runner" ? "runnerWarningCount" : "customerWarningCount";
  const next =
    ((party === "runner" ? order.runnerWarningCount : order.customerWarningCount) ??
      0) + 1;
  if (isFirebaseConfigured()) {
    await updateDoc(doc(getDb(), ORDERS_COLLECTION, orderId), {
      [field]: next,
      lastEscalatedAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });
  }
}
