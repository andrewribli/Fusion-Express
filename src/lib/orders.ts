import {
  addMockOrder,
  getMockActiveOrders,
  getMockOrderById,
  getMockPendingOrders,
  getMockRunnerOrders,
} from "@/data/mock-orders";
import type { Order, OrderStatus } from "@/lib/types";
import { normalizeOrderStatus } from "@/lib/order-status";
import { omitUndefined } from "@/lib/omit-undefined";
import { getDb, getFirebaseStorage, isFirebaseConfigured } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const ORDERS_COLLECTION = "orders";
const ORDER_HISTORY_KEY = "fusion_order_history";

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as Timestamp).toDate();
  }
  return new Date(String(value));
}

function parseOrder(id: string, data: Record<string, unknown>): Order {
  return {
    id,
    sessionId: String(data.sessionId ?? ""),
    customerId: String(data.customerId ?? data.sessionId ?? ""),
    customerName: data.customerName ? String(data.customerName) : undefined,
    items: (data.items as Order["items"]) ?? [],
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
  };
}

export function saveOrderToHistory(orderId: string): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(ORDER_HISTORY_KEY);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  if (!ids.includes(orderId)) {
    localStorage.setItem(
      ORDER_HISTORY_KEY,
      JSON.stringify([orderId, ...ids].slice(0, 50)),
    );
  }
}

export function getOrderHistoryIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
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
  const order = await fetchOrder(orderId);
  if (!order) throw new Error("Order not found");

  if (order.customerId === runnerCustomerId) {
    throw new SelfPickupError();
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
  file: File,
): Promise<string> {
  if (isFirebaseConfigured()) {
    try {
      const storageRef = ref(
        getFirebaseStorage(),
        `delivery-proofs/${orderId}/${file.name}`,
      );
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch {
      // fallback
    }
  }

  return `mock://delivery/${orderId}/${file.name}`;
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
  if (order.status !== "pending") {
    throw new Error("Order can only be cancelled while pending");
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
