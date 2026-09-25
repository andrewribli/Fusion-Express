import type { OrderStatus } from "./order-status";

export type DeliveryActor = "runner" | "customer" | "admin" | "webhook";

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
  dropoffPhotoUrl?: string;
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
