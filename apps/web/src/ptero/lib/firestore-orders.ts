import type { Order as SharedOrder } from "@fusion-express/shared/types";
import type { Order as PteroOrder, OrderItem } from "@/ptero/lib/types";
import { CAMPUS_ID } from "@/ptero/config/campus";
import { createOrderOnServer } from "@/lib/create-order-server";
import {
  subscribePendingOrders,
  acceptOrder as acceptFirestoreOrder,
} from "@fusion-express/shared/orders";
import { getAuthClient, isFirebaseConfigured } from "@/lib/firebase";

export function isCloudOrderId(orderId: string): boolean {
  return !orderId.startsWith("CYU-");
}

function mapOrderChannel(
  channel: PteroOrder["orderChannel"],
): SharedOrder["orderChannel"] {
  if (channel === "canteen") return "canteen";
  if (channel === "wellcome") return "taste";
  return "taste";
}

function sharedItemsToPtero(items: SharedOrder["items"]): OrderItem[] {
  return items.map((item) => ({
    itemId: item.itemId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    weightKg: item.weightKg,
  }));
}

/** Map a Firestore GraceRun order into the CityU prototype shape. */
export function sharedOrderToPtero(order: SharedOrder): PteroOrder {
  const channel =
    order.orderChannel === "fusion"
      ? ("taste" as const)
      : order.orderChannel === "canteen"
        ? ("canteen" as const)
        : ("taste" as const);
  return {
    id: order.id,
    campus: order.campus ?? CAMPUS_ID,
    orderChannel: channel,
    canteenRestaurantId: order.canteenRestaurantId,
    canteenCollege: (order.canteenCollege as PteroOrder["canteenCollege"]) ?? null,
    sessionId: order.sessionId,
    customerId: order.customerId,
    customerName: order.customerName ?? "Customer",
    customerEmail: order.customerEmail,
    items: sharedItemsToPtero(order.items),
    status: order.status as PteroOrder["status"],
    compound: order.college,
    hall: order.hall,
    lobby: order.lobbyPoint,
    customerNote: order.customerNote ?? "",
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    deliveryBase: order.deliveryBase,
    deliverySurcharge: order.deliverySurcharge,
    deliveryTotal: order.deliveryTotal,
    tip: order.tip ?? 0,
    platformFee: order.platformFee,
    receiptTotal: order.finalTotal,
    runnerId: order.runnerUid ?? order.runnerId,
    runnerName: order.runnerName,
    runnerCollege: (order.runnerCollege as PteroOrder["runnerCollege"]) ?? null,
    discountApplied: order.discountApplied,
    discountAmount: order.discountAmount,
    createdAt: order.createdAt.toISOString(),
    scheduledFor: order.scheduledFor?.toISOString(),
    paidAt: order.customerPaidAt?.toISOString(),
  };
}

export type PteroOrderDraft = Omit<
  PteroOrder,
  "id" | "campus" | "createdAt" | "status"
>;

export async function persistPteroOrderToFirestore(
  draft: PteroOrderDraft,
): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;
  const auth = getAuthClient();
  if (!auth.currentUser) return null;

  const sourceId =
    draft.canteenRestaurantId ||
    draft.grocerySource ||
    (draft.orderChannel === "wellcome" ? "wellcome" : "taste");
  const placed = await createOrderOnServer({
    sessionId: draft.sessionId,
    customerName: draft.customerName,
    customerEmail: draft.customerEmail,
    campus: CAMPUS_ID,
    sourceId,
    hallId: draft.hall,
    orderChannel: mapOrderChannel(draft.orderChannel),
    canteenRestaurantId: draft.canteenRestaurantId,
    canteenCollege: draft.canteenCollege ?? undefined,
    items: draft.items.map((item) => ({
      itemId: item.itemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      weightKg: item.weightKg,
    })),
    college: draft.compound,
    hall: draft.hall,
    lobbyPoint: draft.lobby,
    customerNote: draft.customerNote,
    subtotal: draft.subtotal,
    tip: draft.tip,
    scheduledFor: draft.scheduledFor,
  });
  draft.deliveryFee = placed.deliveryFee;
  draft.deliveryBase = placed.deliveryBase;
  draft.deliverySurcharge = placed.deliverySurcharge;
  draft.deliveryTotal = placed.deliveryTotal;
  draft.platformFee = placed.platformFee;
  return placed.id;
}

/**
 * CityU runner board. Firestore pending orders for campus `cityu` only.
 * Tickets that never left the customer's browser (`CYU-…` in localStorage)
 * cannot show up for a runner on another device.
 */
export function subscribeCityuPendingOrders(
  onPending: (orders: PteroOrder[]) => void,
  opts?: {
    excludeCustomerId?: string;
    excludeCustomerEmail?: string | null;
    onError?: (err: Error) => void;
  },
): () => void {
  if (!isFirebaseConfigured()) {
    onPending([]);
    return () => undefined;
  }
  return subscribePendingOrders(
    (rows) => onPending(rows.map(sharedOrderToPtero)),
    {
      campus: CAMPUS_ID,
      excludeCustomerId: opts?.excludeCustomerId,
      excludeCustomerEmail: opts?.excludeCustomerEmail,
      onError: opts?.onError,
    },
  );
}

export async function acceptPteroOrderOnFirestore(opts: {
  orderId: string;
  runnerDocId: string;
  runnerUid: string;
  runnerName: string;
  runnerEmail?: string | null;
  runnerPhone?: string;
  discount?: {
    discountApplied: boolean;
    discountAmount: number;
    runnerCollege?: string;
    canteenCollege?: string;
    subtotal: number;
    total: number;
  };
}): Promise<void> {
  await acceptFirestoreOrder(
    opts.orderId,
    opts.runnerDocId,
    opts.runnerName,
    opts.runnerUid,
    {
      method: "PayMe",
      id: opts.runnerPhone?.trim() || "cityu-runner",
      email: opts.runnerEmail ?? undefined,
    },
    opts.discount,
    CAMPUS_ID,
  );
}
