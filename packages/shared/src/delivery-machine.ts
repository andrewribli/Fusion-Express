import type { OrderStatus } from "./order-status";

export type DeliveryActor = "runner" | "customer" | "admin" | "webhook";

/** CityU canteen orders must store a receipt photo and HKD total before delivery. */
export function isCityuCanteenOrder(order: {
  campus?: string | null;
  orderChannel?: string | null;
  items?: { itemId?: string | null }[] | null;
}): boolean {
  if (String(order.campus ?? "").trim().toLowerCase() !== "cityu") return false;
  if (String(order.orderChannel ?? "").trim().toLowerCase() === "canteen") {
    return true;
  }
  return (order.items ?? []).some((item) =>
    String(item.itemId ?? "").startsWith("canteen:"),
  );
}

/**
 * Positive HKD amount with at most two decimal places.
 * Rejects empty, zero, negative, and values that are not exact cents.
 */
export function parseHkdAmount(value: unknown): number | undefined {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return undefined;
    const cents = Math.round(value * 100);
    if (Math.abs(value * 100 - cents) > 0.001) return undefined;
    return cents / 100;
  }
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return undefined;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return Math.round(amount * 100) / 100;
}

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "accepted",
  accepted: "purchased",
  purchased: "receipt_uploaded",
  receipt_uploaded: "delivered",
  delivered: "paid",
  paid: "runner_paid",
  runner_paid: "completed",
};

/** Server-side status machine. Rejects skips and the wrong actor. */
export function assertDeliveryTransition(opts: {
  from: OrderStatus;
  to: OrderStatus;
  actor: DeliveryActor;
  isAssignedRunner: boolean;
  receiptUrl?: string;
  receiptAmount?: number;
  dropoffPhotoUrl?: string;
  /** CityU canteen: block delivery until the receipt photo and HKD total exist. */
  requireReceiptTotal?: boolean;
}): void {
  const expected = NEXT[opts.from];
  if (expected !== opts.to) {
    throw new Error(`Cannot move an order from ${opts.from} to ${opts.to}.`);
  }
  if (opts.actor === "customer") {
    throw new Error("Customers cannot change delivery status.");
  }
  if (opts.to === "accepted" && opts.actor !== "runner") {
    throw new Error("Only a runner can accept an order.");
  }
  if (
    (opts.to === "purchased" ||
      opts.to === "receipt_uploaded" ||
      opts.to === "delivered") &&
    (opts.actor !== "runner" || !opts.isAssignedRunner)
  ) {
    throw new Error("Only the assigned runner can update this order.");
  }
  if (opts.to === "receipt_uploaded" && !opts.receiptUrl) {
    throw new Error("Upload the receipt before continuing.");
  }
  if (
    opts.requireReceiptTotal &&
    opts.to === "receipt_uploaded" &&
    !(opts.receiptAmount != null && opts.receiptAmount > 0)
  ) {
    throw new Error("Enter the receipt total in HKD.");
  }
  if (opts.requireReceiptTotal && opts.to === "delivered") {
    if (!opts.receiptUrl || !(opts.receiptAmount != null && opts.receiptAmount > 0)) {
      throw new Error(
        "Upload the receipt and enter the HKD total before marking delivered.",
      );
    }
  }
  if (opts.to === "delivered" && !opts.dropoffPhotoUrl) {
    throw new Error("A lobby drop-off photo is required.");
  }
  if (opts.to === "paid" && opts.actor !== "webhook" && opts.actor !== "admin") {
    throw new Error("Only the payment webhook can mark an order paid.");
  }
  if (
    (opts.to === "runner_paid" || opts.to === "completed") &&
    opts.actor !== "admin"
  ) {
    throw new Error("Only an admin can update this status.");
  }
}
