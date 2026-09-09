import {
  addMockOrder,
  getMockActiveOrders,
  getMockOrderById,
  getMockPendingOrders,
  getMockRunnerOrders,
} from "./mock-orders";
import { collectionName, isStagingApp, storagePath } from "./app-env";
import type { Order, OrderItem, OrderStatus, PriceAdjustmentStatus } from "./types";
import { normalizeOrderStatus } from "./order-status";
import { omitUndefined } from "./omit-undefined";
import { getDb, getFirebaseStorage, isFirebaseConfigured } from "./firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
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
    runnerId: data.runnerId ? String(data.runnerId) : undefined,
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
  const now = new Date();
  const id = `FE-${Math.floor(1000 + Math.random() * 9000)}`;

  if (isFirebaseConfigured()) {
    try {
      const payload = omitUndefined({
        ...order,
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
      saveOrderToHistory(ref.id);
      return ref.id;
    } catch (err) {
      console.error("createOrder Firestore failed", err);
      throw err instanceof Error
        ? err
        : new Error("Could not save order. Try again.");
    }
  }

  const fullOrder: Order = {
    ...order,
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

export async function fetchPendingOrders(
  excludeCustomerId?: string,
): Promise<Order[]> {
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(getDb(), ORDERS_COLLECTION));
      const orders = snap.docs
        .map((d) => parseOrder(d.id, d.data() as Record<string, unknown>))
        .filter((o) => o.status === "pending")
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return filterOwnOrders(orders, excludeCustomerId);
    } catch (err) {
      console.error("fetchPendingOrders Firestore failed", err);
      throw err instanceof Error
        ? err
        : new Error("Could not load available orders.");
    }
  }

  return filterOwnOrders(getMockPendingOrders(), excludeCustomerId);
}

async function fetchAllOrdersFromFirestore(): Promise<Order[]> {
  const snap = await getDocs(collection(getDb(), ORDERS_COLLECTION));
  return snap.docs.map((d) =>
    parseOrder(d.id, d.data() as Record<string, unknown>),
  );
}

export async function fetchRunnerOrders(runnerId: string): Promise<Order[]> {
  if (isFirebaseConfigured()) {
    try {
      const orders = await fetchAllOrdersFromFirestore();
      return orders.filter(
        (o) =>
          o.runnerId === runnerId &&
          (o.status === "assigned" || o.status === "picked"),
      );
    } catch (err) {
      console.error("fetchRunnerOrders Firestore failed", err);
      throw err instanceof Error
        ? err
        : new Error("Could not load your active orders.");
    }
  }

  return getMockRunnerOrders(runnerId);
}

export async function fetchDeliveredOrdersByRunner(
  runnerId: string,
): Promise<Order[]> {
  if (isFirebaseConfigured()) {
    try {
      const orders = await fetchAllOrdersFromFirestore();
      return orders.filter(
        (o) => o.runnerId === runnerId && o.status === "delivered",
      );
    } catch (err) {
      console.error("fetchDeliveredOrdersByRunner Firestore failed", err);
      throw err instanceof Error
        ? err
        : new Error("Could not load completed deliveries.");
    }
  }

  return getMockRunnerOrders(runnerId, true);
}

export async function acceptOrder(
  orderId: string,
  runnerId: string,
  runnerName: string,
  runnerCustomerId: string,
): Promise<void> {
  if (isFirebaseConfigured()) {
    const db = getDb();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists()) throw new Error("Order not found");
      const order = parseOrder(snap.id, snap.data() as Record<string, unknown>);
      if (order.customerId === runnerCustomerId) {
        throw new SelfPickupError();
      }
      if (order.status !== "pending") {
        if (order.runnerId === runnerId) return;
        throw new OrderAlreadyTakenError();
      }
      tx.update(orderRef, {
        status: "assigned",
        runnerId,
        runnerName,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    });
    return;
  }

  const order = await fetchOrder(orderId);
  if (!order) throw new Error("Order not found");
  if (order.customerId === runnerCustomerId) {
    throw new SelfPickupError();
  }
  if (order.status !== "pending") {
    if (order.runnerId === runnerId) return;
    throw new OrderAlreadyTakenError();
  }
  await updateOrderStatus(orderId, "assigned", { runnerId, runnerName });
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  extras?: Partial<
    Pick<Order, "runnerName" | "runnerId" | "deliveryPhotoUrl">
  >,
): Promise<void> {
  const now = new Date();

  if (isFirebaseConfigured()) {
    try {
      const updates: Record<string, unknown> = {
        status,
        updatedAt: Timestamp.fromDate(now),
      };
      if (status === "picked") {
        updates.pickedUpAt = Timestamp.fromDate(now);
      }
      if (status === "delivered") {
        updates.deliveredAt = Timestamp.fromDate(now);
      }
      if (extras?.runnerName) updates.runnerName = extras.runnerName;
      if (extras?.runnerId) updates.runnerId = extras.runnerId;
      if (extras?.deliveryPhotoUrl) {
        updates.deliveryPhotoUrl = extras.deliveryPhotoUrl;
      }
      await updateDoc(doc(getDb(), ORDERS_COLLECTION, orderId), updates);
      return;
    } catch {
      // fallback to mock in-memory
    }
  }

  const order = getMockOrderById(orderId);
  if (order) {
    order.status = status;
    order.updatedAt = now;
    if (status === "picked") order.pickedUpAt = now;
    if (status === "delivered") order.deliveredAt = now;
    if (extras?.runnerName) order.runnerName = extras.runnerName;
    if (extras?.runnerId) order.runnerId = extras.runnerId;
    if (extras?.deliveryPhotoUrl) order.deliveryPhotoUrl = extras.deliveryPhotoUrl;
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
    (order.status === "assigned" || order.status === "pending");
  if (!canCancelPending && !canCancelPriceIncrease) {
    throw new Error("Order can only be cancelled before pickup");
  }
  await updateOrderStatus(orderId, "cancelled");
}

export async function fetchLiveDeliveryCount(): Promise<number> {
  if (isFirebaseConfigured()) {
    try {
      const q = query(
        collection(getDb(), ORDERS_COLLECTION),
        where("status", "in", ["assigned", "picked"]),
      );
      const snap = await getDocs(q);
      return snap.size;
    } catch {
      // fallback
    }
  }
  return getMockActiveOrders().length;
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

export async function countRunnerActiveOrders(runnerId: string): Promise<number> {
  const orders = await fetchRunnerOrders(runnerId);
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
  if (order.status !== "assigned") {
    throw new Error("Till prices can only be submitted before pickup");
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

export async function fetchOrdersNeedingRefund(): Promise<Order[]> {
  const orders = isFirebaseConfigured()
    ? await fetchAllOrdersFromFirestore()
    : [
        ...getMockPendingOrders(),
        ...getMockActiveOrders(),
        ...getMockRunnerOrders("demo-runner", true),
      ];
  return orders
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
  if (order.status !== "assigned") return false;
  if (!tillPricesReady(order)) return false;
  if (awaitingCustomerPriceApproval(order)) return false;
  return true;
}
