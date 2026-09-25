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
import type { CampusId } from "./campus";
import {
  ACTIVE_ORDER_LIMIT_MESSAGE,
  CUSTOMER_DEADLINE_REMINDER_MS,
  CUSTOMER_PAY_WINDOW_MS,
  customerDeadlineOf,
  countsTowardCustomerOrderPlacementCap,
  isActiveCustomerOrderStatus,
  isClaimableOrderStatus,
  isCustomerPaymentOpen,
  isRunnerDeliveryOpen,
  MAX_ACTIVE_CUSTOMER_ORDERS,
  normalizeOrderStatus,
  RUNNER_DEADLINE_REMINDER_MS,
  RUNNER_DELIVERY_WINDOW_MS,
  runnerDeadlineOf,
} from "./order-status";
import { omitUndefined } from "./omit-undefined";
import { getAuthClient, getDb, getFirebaseStorage, isFirebaseConfigured } from "./firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  startAfter,
  updateDoc,
  where,
  Timestamp,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
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
  const items = parseItems(data.items);
  const orderChannelRaw = String(data.orderChannel ?? "").trim().toLowerCase();
  const orderChannel =
    orderChannelRaw === "canteen" ||
    orderChannelRaw === "fusion" ||
    orderChannelRaw === "taste"
      ? (orderChannelRaw as Order["orderChannel"])
      : items.some((item) => item.itemId.startsWith("canteen:"))
        ? ("canteen" as const)
        : undefined;
  const campusRaw = String(data.campus ?? "").trim().toLowerCase();
  const campus =
    campusRaw === "cuhk" || campusRaw === "cityu"
      ? (campusRaw as Order["campus"])
      : undefined;
  return {
    id,
    sessionId: String(data.sessionId ?? ""),
    customerId: String(data.customerId ?? data.sessionId ?? ""),
    customerName: data.customerName ? String(data.customerName) : undefined,
    customerEmail: data.customerEmail ? String(data.customerEmail) : undefined,
    customerPhone: data.customerPhone ? String(data.customerPhone) : undefined,
    campus,
    orderChannel,
    canteenRestaurantId: data.canteenRestaurantId
      ? String(data.canteenRestaurantId)
      : undefined,
    items,
    status: normalizeOrderStatus(String(data.status ?? "pending")),
    college: String(data.college ?? data.compound ?? ""),
    hall: String(data.hall ?? ""),
    roomNumber: data.roomNumber ? String(data.roomNumber) : undefined,
    lobbyPoint: String(data.lobbyPoint ?? data.lobby ?? ""),
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
    discountApplied:
      data.discountApplied != null ? Boolean(data.discountApplied) : undefined,
    discountAmount:
      data.discountAmount != null ? Number(data.discountAmount) : undefined,
    runnerCollege: data.runnerCollege ? String(data.runnerCollege) : undefined,
    canteenCollege: data.canteenCollege ? String(data.canteenCollege) : undefined,
    paymentReceived: Boolean(data.paymentReceived),
    paymentMethod: data.paymentMethod as Order["paymentMethod"],
    paymentProvider: data.paymentProvider
      ? String(data.paymentProvider)
      : undefined,
    awaitingOnlinePayment:
      data.awaitingOnlinePayment != null
        ? Boolean(data.awaitingOnlinePayment)
        : undefined,
    airwallexPaymentIntentId: data.airwallexPaymentIntentId
      ? String(data.airwallexPaymentIntentId)
      : undefined,
    airwallexPaidAmount:
      data.airwallexPaidAmount != null
        ? Number(data.airwallexPaidAmount)
        : undefined,
    airwallexPaidCurrency: data.airwallexPaidCurrency
      ? String(data.airwallexPaidCurrency)
      : undefined,
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
    // Placement cap: in-flight delivery only (pending|accepted|purchased).
    // Delivered / runner_paid still need payment UI but must not lock out
    // new grocery orders when paymentReceived stays false.
    const inFlight = await fetchInFlightCustomerOrders(order.customerId);
    if (inFlight.length >= MAX_ACTIVE_CUSTOMER_ORDERS) {
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

export type RunnerSelfPickupIdentity = {
  uid?: string;
  email?: string | null;
};

function normalizeIdentityEmail(email?: string | null): string | undefined {
  if (!email) return undefined;
  const trimmed = email.trim().toLowerCase();
  return trimmed || undefined;
}

/** Blocks runners from claiming orders they placed (uid or customer email). */
export function isOwnCustomerOrder(
  order: Pick<Order, "customerId" | "customerEmail">,
  runner: RunnerSelfPickupIdentity,
): boolean {
  const runnerUid = runner.uid?.trim();
  if (runnerUid && order.customerId === runnerUid) return true;
  const orderEmail = normalizeIdentityEmail(order.customerEmail);
  const runnerEmail = normalizeIdentityEmail(runner.email);
  if (orderEmail && runnerEmail && orderEmail === runnerEmail) return true;
  return false;
}

function runnerExcludeFromOptions(options?: {
  excludeCustomerId?: string;
  excludeCustomerEmail?: string | null;
}): RunnerSelfPickupIdentity | undefined {
  if (!options?.excludeCustomerId && !options?.excludeCustomerEmail) {
    return undefined;
  }
  return {
    uid: options.excludeCustomerId,
    email: options.excludeCustomerEmail,
  };
}

function filterOwnOrders(
  orders: Order[],
  exclude?: RunnerSelfPickupIdentity,
): Order[] {
  if (!exclude?.uid && !exclude?.email) return orders;
  return orders.filter((o) => !isOwnCustomerOrder(o, exclude));
}

/** Orders placed before multi-campus have no `campus`; they are all CUHK. */
export function orderCampus(order: Pick<Order, "campus">): CampusId {
  return order.campus ?? "cuhk";
}

function filterCampusOrders(orders: Order[], campus?: CampusId): Order[] {
  if (!campus) return orders;
  return orders.filter((o) => orderCampus(o) === campus);
}

const ORDER_PAGE_SIZE = 100;
/**
 * Pending board page size. Campus is applied after the read, so stopping at
 * one page of the newest tickets drops older CityU jobs once newer CUHK
 * tickets fill that page. Walk the status+createdAt index (already deployed)
 * until the board is exhausted.
 */
const PENDING_MAX_PAGES = 30;
const PENDING_LISTENER_LIMIT = ORDER_PAGE_SIZE * PENDING_MAX_PAGES;

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
  campus?: CampusId,
  excludeCustomerEmail?: string | null,
): Promise<Order[]> {
  return filterCampusOrders(
    await fetchUnscopedPendingOrders(excludeCustomerId, excludeCustomerEmail),
    campus,
  );
}

function pendingPageConstraints(
  cursor?: QueryDocumentSnapshot,
): QueryConstraint[] {
  const constraints: QueryConstraint[] = [
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
    limit(ORDER_PAGE_SIZE),
  ];
  if (cursor) constraints.push(startAfter(cursor));
  return constraints;
}

async function fetchUnscopedPendingOrders(
  excludeCustomerId?: string,
  excludeCustomerEmail?: string | null,
): Promise<Order[]> {
  if (isFirebaseConfigured()) {
    try {
      // Paid (Airwallex) orders are claimable. Legacy unpaid pending (no online
      // checkout) stay claimable so older tickets are not stranded.
      // Rules require status == 'pending' on this list. Campus is not in the
      // query: legacy CUHK tickets have no campus field, and a campus equality
      // filter would need a new composite index.
      const col = collection(getDb(), ORDERS_COLLECTION);
      const docs: QueryDocumentSnapshot[] = [];
      let cursor: QueryDocumentSnapshot | undefined;
      for (let page = 0; page < PENDING_MAX_PAGES; page++) {
        const snap = await getDocs(
          query(col, ...pendingPageConstraints(cursor)),
        );
        docs.push(...snap.docs);
        if (snap.size < ORDER_PAGE_SIZE) break;
        cursor = snap.docs[snap.docs.length - 1];
        if (page === PENDING_MAX_PAGES - 1) {
          console.warn(
            "fetchPendingOrders hit the pending-order page cap; older tickets may be missing",
          );
        }
      }
      return filterOwnOrders(
        parseSnapshotDocs(docs).filter((o) => !o.runnerId),
        runnerExcludeFromOptions({
          excludeCustomerId,
          excludeCustomerEmail,
        }),
      );
    } catch (err) {
      console.error("fetchPendingOrders Firestore failed", err);
      throw err instanceof Error
        ? err
        : new Error("Could not load available orders.");
    }
  }

  return filterOwnOrders(
    getMockPendingOrders().filter((o) => !o.runnerId),
    runnerExcludeFromOptions({
      excludeCustomerId,
      excludeCustomerEmail,
    }),
  );
}

/**
 * Live pending job-board feed for runners.
 *
 * Rules require `status == 'pending'` on the list query. Unassigned orders and
 * campus are filtered client-side so legacy CUHK tickets (no `campus` field)
 * stay on the CUHK board, and so we keep the deployed status+createdAt index.
 *
 * Refresh loads every pending page once, then keeps a live listener on that
 * same window. A listener limited to the newest 100 tickets dropped older
 * CityU jobs whenever newer CUHK tickets filled the page.
 *
 * Orders that never reached Firestore (CityU guest checkout kept only in that
 * browser's localStorage, ids starting with `CYU-`) cannot appear here.
 */
export function subscribePendingOrders(
  onOrders: (orders: Order[]) => void,
  options?: {
    excludeCustomerId?: string;
    excludeCustomerEmail?: string | null;
    /** Only show jobs on the runner's own campus. */
    campus?: CampusId;
    onError?: (err: Error) => void;
  },
): () => void {
  const excludeRunner = runnerExcludeFromOptions(options);
  const emit = (orders: Order[]) => {
    onOrders(
      filterCampusOrders(
        filterOwnOrders(
          orders.filter((o) => !o.runnerId),
          excludeRunner,
        ),
        options?.campus,
      ),
    );
  };

  if (!isFirebaseConfigured()) {
    emit(getMockPendingOrders());
    const interval = setInterval(() => {
      emit(getMockPendingOrders());
    }, 3000);
    return () => clearInterval(interval);
  }

  let stopped = false;
  let sawOrders = false;
  let listenerReady = false;
  let unsubSnap: () => void = () => undefined;

  const fail = (err: unknown) => {
    console.error("subscribePendingOrders Firestore failed", err);
    options?.onError?.(
      err instanceof Error ? err : new Error(String(err)),
    );
    if (!sawOrders) onOrders([]);
  };

  const pull = async () => {
    try {
      const orders = await fetchUnscopedPendingOrders(
        options?.excludeCustomerId,
        options?.excludeCustomerEmail,
      );
      if (stopped || listenerReady) return;
      sawOrders = true;
      emit(orders);
    } catch (err) {
      if (stopped || listenerReady) return;
      fail(err);
    }
  };

  const attach = () => {
    unsubSnap();
    try {
      const q = query(
        collection(getDb(), ORDERS_COLLECTION),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc"),
        limit(PENDING_LISTENER_LIMIT),
      );
      unsubSnap = onSnapshot(
        q,
        (snap) => {
          if (stopped) return;
          listenerReady = true;
          sawOrders = true;
          emit(parseSnapshotDocs(snap.docs));
        },
        (err) => {
          if (!stopped) fail(err);
        },
      );
    } catch (err) {
      fail(err);
    }
  };

  let unsubAuth: () => void = () => undefined;
  try {
    // Persistence restores after refresh. Querying before that fails the
    // listener permanently, so the board never fills the backlog.
    unsubAuth = onAuthStateChanged(getAuthClient(), (user) => {
      if (stopped) return;
      unsubSnap();
      if (!user) return;
      void user.getIdToken().then(() => {
        if (stopped) return;
        void pull();
        attach();
      }, fail);
    });
  } catch (err) {
    fail(err);
  }

  return () => {
    stopped = true;
    unsubSnap();
    unsubAuth();
  };
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

/** Orders that count toward MAX_ACTIVE_CUSTOMER_ORDERS on place. */
export async function fetchInFlightCustomerOrders(
  customerId: string,
): Promise<Order[]> {
  const orders = await fetchOrdersByCustomer(customerId);
  return orders.filter((order) =>
    countsTowardCustomerOrderPlacementCap(order.status),
  );
}

export async function fetchRunnerOrders(runnerUid: string): Promise<Order[]> {
  if (!runnerUid) return [];
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(
        query(
          collection(getDb(), ORDERS_COLLECTION),
          where("runnerUid", "==", runnerUid),
          where("status", "in", [
            "accepted",
            "purchased",
            "receipt_uploaded",
            "assigned",
            "picked",
          ]),
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
 * @param payment optional PayMe/FPS + email denormalized onto the order
 * @param discount optional same-college canteen discount applied at accept
 */
export async function acceptOrder(
  orderId: string,
  runnerId: string,
  runnerName: string,
  runnerUid: string,
  payment?: { method: "PayMe" | "FPS"; id: string; email?: string },
  discount?: {
    discountApplied: boolean;
    discountAmount: number;
    runnerCollege?: string;
    canteenCollege?: string;
    subtotal: number;
    total: number;
  },
  runnerCampus?: CampusId,
): Promise<void> {
  const now = new Date();
  const paymentFields = omitUndefined({
    runnerPaymentMethod: payment?.method,
    runnerPaymentId: payment?.id,
    runnerEmail: payment?.email,
  });
  const discountFields = discount
    ? omitUndefined({
        discountApplied: discount.discountApplied,
        discountAmount: discount.discountAmount,
        runnerCollege: discount.runnerCollege,
        canteenCollege: discount.canteenCollege,
        subtotal: discount.subtotal,
        total: discount.total,
      })
    : {};
  if (isFirebaseConfigured()) {
    const db = getDb();
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists()) throw new Error("Order not found");
      const order = parseOrder(snap.id, snap.data() as Record<string, unknown>);
      if (
        isOwnCustomerOrder(order, {
          uid: runnerUid,
          email: payment?.email,
        })
      ) {
        throw new SelfPickupError();
      }
      if (runnerCampus && orderCampus(order) !== runnerCampus) {
        throw new Error("This order is on a different campus.");
      }
      if (!isClaimableOrderStatus(order.status)) {
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
        ...discountFields,
      });
    });
    return;
  }

  const order = await fetchOrder(orderId);
  if (!order) throw new Error("Order not found");
  if (
    isOwnCustomerOrder(order, {
      uid: runnerUid,
      email: payment?.email,
    })
  ) {
    throw new SelfPickupError();
  }
  if (!isClaimableOrderStatus(order.status)) {
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
    ...(discount
      ? {
          discountApplied: discount.discountApplied,
          discountAmount: discount.discountAmount,
          runnerCollege: discount.runnerCollege,
          canteenCollege: discount.canteenCollege,
          subtotal: discount.subtotal,
          total: discount.total,
        }
      : {}),
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
      | "discountApplied"
      | "discountAmount"
      | "runnerCollege"
      | "canteenCollege"
      | "subtotal"
      | "total"
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
      if (status === "paid" || status === "customer_paid") {
        updates.customerPaidAt = Timestamp.fromDate(now);
        updates.paymentReceived = true;
        updates.awaitingOnlinePayment = false;
      }
      if (status === "runner_paid") {
        updates.runnerPaidAt = Timestamp.fromDate(now);
      }
      if (status === "completed") {
        updates.runnerPaidAt = updates.runnerPaidAt ?? Timestamp.fromDate(now);
        updates.paymentReceived = true;
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
      if (extras?.discountApplied != null) {
        updates.discountApplied = extras.discountApplied;
      }
      if (extras?.discountAmount != null) {
        updates.discountAmount = extras.discountAmount;
      }
      if (extras?.runnerCollege) updates.runnerCollege = extras.runnerCollege;
      if (extras?.canteenCollege) updates.canteenCollege = extras.canteenCollege;
      if (extras?.subtotal != null) updates.subtotal = extras.subtotal;
      if (extras?.total != null) updates.total = extras.total;
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
    if (status === "paid" || status === "customer_paid") {
      order.customerPaidAt = now;
      order.paymentReceived = true;
      order.awaitingOnlinePayment = false;
    }
    if (status === "runner_paid") order.runnerPaidAt = now;
    if (status === "completed") {
      order.runnerPaidAt = order.runnerPaidAt ?? now;
      order.paymentReceived = true;
    }
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
    if (extras?.discountApplied != null) {
      order.discountApplied = extras.discountApplied;
    }
    if (extras?.discountAmount != null) {
      order.discountAmount = extras.discountAmount;
    }
    if (extras?.runnerCollege) order.runnerCollege = extras.runnerCollege;
    if (extras?.canteenCollege) order.canteenCollege = extras.canteenCollege;
    if (extras?.subtotal != null) order.subtotal = extras.subtotal;
    if (extras?.total != null) order.total = extras.total;
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
  if (!isFirebaseConfigured()) {
    return `mock://delivery/${orderId}/${name}`;
  }
  try {
    const storageRef = ref(
      getFirebaseStorage(),
      storagePath(`delivery-proofs/${orderId}/${Date.now()}-${name}`),
    );
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (err) {
    console.error("uploadDeliveryPhoto failed", err);
    throw new Error("Lobby photo upload failed. Please try again.");
  }
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
  if (!isFirebaseConfigured()) {
    return `mock://receipt/${orderId}/${name}`;
  }
  try {
    const storageRef = ref(
      getFirebaseStorage(),
      storagePath(`receipts/${orderId}/${Date.now()}-${name}`),
    );
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (err) {
    console.error("uploadReceiptPhoto failed", err);
    throw new Error("Receipt upload failed. Please try again.");
  }
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

/** Canteen pickup: no Fusion receipt — just mark purchased / picked up. */
export async function markCanteenPickedUp(orderId: string): Promise<void> {
  await updateOrderStatus(orderId, "purchased");
}

/** Canteen deliver: fixed menu total (already discounted) + optional lobby photo. */
export async function markCanteenDelivered(
  orderId: string,
  opts: { finalTotal: number; deliveryPhotoUrl?: string },
): Promise<void> {
  if (!(opts.finalTotal > 0)) {
    throw new Error("Enter the canteen order total.");
  }
  const amount = round2(opts.finalTotal);
  await updateOrderStatus(orderId, "delivered", {
    finalTotal: amount,
    amountPaidByRunner: amount,
    deliveryPhotoUrl: opts.deliveryPhotoUrl,
    runnerVerified: true,
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
  if (!isFirebaseConfigured()) {
    return `mock://bank/${orderId}/${name}`;
  }
  try {
    const storageRef = ref(
      getFirebaseStorage(),
      storagePath(`bank-statements/${orderId}/${Date.now()}-${name}`),
    );
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (err) {
    console.error("uploadBankStatementPhoto failed", err);
    throw new Error("Bank statement upload failed. Please try again.");
  }
}

/** Persist runner proof fields without changing order status (survives refresh). */
export async function saveRunnerDeliveryProgress(
  orderId: string,
  progress: {
    receiptUrl?: string;
    bankStatementUrl?: string;
    deliveryPhotoUrl?: string;
    finalTotal?: number;
    runnerVerified?: boolean;
  },
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (progress.receiptUrl) updates.receiptUrl = progress.receiptUrl;
  if (progress.bankStatementUrl) {
    updates.bankStatementUrl = progress.bankStatementUrl;
  }
  if (progress.deliveryPhotoUrl) {
    updates.deliveryPhotoUrl = progress.deliveryPhotoUrl;
  }
  if (progress.finalTotal != null) {
    if (!(progress.finalTotal > 0)) {
      throw new Error("Enter the Fusion receipt total.");
    }
    updates.finalTotal = round2(progress.finalTotal);
  }
  if (progress.runnerVerified != null) {
    updates.runnerVerified = progress.runnerVerified;
  }
  if (Object.keys(updates).length === 0) return;

  const now = new Date();
  if (isFirebaseConfigured()) {
    try {
      await updateDoc(doc(getDb(), ORDERS_COLLECTION, orderId), omitUndefined({
        ...updates,
        updatedAt: Timestamp.fromDate(now),
      }));
      return;
    } catch (err) {
      console.error("saveRunnerDeliveryProgress failed", err);
      throw err instanceof Error
        ? err
        : new Error("Could not save progress. Please try again.");
    }
  }

  const order = getMockOrderById(orderId);
  if (!order) throw new Error("Order not found");
  if (progress.receiptUrl) order.receiptUrl = progress.receiptUrl;
  if (progress.bankStatementUrl) {
    order.bankStatementUrl = progress.bankStatementUrl;
  }
  if (progress.deliveryPhotoUrl) {
    order.deliveryPhotoUrl = progress.deliveryPhotoUrl;
  }
  if (progress.finalTotal != null) order.finalTotal = round2(progress.finalTotal);
  if (progress.runnerVerified != null) {
    order.runnerVerified = progress.runnerVerified;
  }
  order.updatedAt = now;
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

export async function confirmCustomerPayment(orderId: string): Promise<void> {
  const order = await fetchOrder(orderId);
  if (!order) throw new Error("Order not found");
  if (order.status !== "delivered" && order.status !== "runner_paid") {
    throw new Error("Payment can be confirmed after delivery.");
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
  if (order.status !== "paid" && order.status !== "customer_paid") {
    throw new Error("Reimburse the runner after the customer has paid.");
  }
  await updateOrderStatus(orderId, "runner_paid");
  await updateOrderStatus(orderId, "completed");
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
