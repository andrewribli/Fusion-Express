export const ORDER_STATUSES = [
  "pending",
  "paid",
  "accepted",
  "purchased",
  "delivered",
  "runner_paid",
  "completed",
  "customer_paid",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  accepted: "Accepted",
  purchased: "Purchased",
  delivered: "Delivered",
  runner_paid: "Runner paid",
  completed: "Completed",
  customer_paid: "Customer paid",
  cancelled: "Cancelled",
};

/** Map legacy Firestore values to current statuses */
export function normalizeOrderStatus(status: string): OrderStatus {
  switch (status) {
    case "runner_assigned":
    case "assigned":
      return "accepted";
    case "picked_up":
    case "picked":
      return "purchased";
    // Legacy docs sometimes stored "completed" for runner reimbursed.
    // New flow uses completed as the terminal state after runner_paid.
    case "complete":
      return "completed";
    default:
      return status as OrderStatus;
  }
}

export const TRACKING_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Awaiting payment" },
  { status: "paid", label: "Paid" },
  { status: "accepted", label: "Accepted" },
  { status: "purchased", label: "Purchased" },
  { status: "delivered", label: "Delivered" },
  { status: "runner_paid", label: "Runner reimbursed" },
  { status: "completed", label: "Completed" },
];

export function getStepIndex(status: OrderStatus): number {
  if (status === "customer_paid") {
    // Legacy post-delivery payment ≈ completed for the progress bar.
    return TRACKING_STEPS.findIndex((s) => s.status === "completed");
  }
  const idx = TRACKING_STEPS.findIndex((s) => s.status === status);
  return idx === -1 ? 0 : idx;
}

export function isActiveRunnerStatus(status: OrderStatus): boolean {
  return status === "accepted" || status === "purchased";
}

/**
 * Customer still needs to follow the order.
 * Used for track badges — not for the new-order placement cap.
 */
export function isActiveCustomerOrderStatus(status: OrderStatus): boolean {
  return (
    status === "pending" ||
    status === "paid" ||
    status === "accepted" ||
    status === "purchased" ||
    status === "delivered"
  );
}

/**
 * In-flight delivery + unpaid checkout. Payment-due delivered tickets must not
 * permanently block new grocery orders.
 */
export function countsTowardCustomerOrderPlacementCap(
  status: OrderStatus,
): boolean {
  return (
    status === "pending" ||
    status === "paid" ||
    status === "accepted" ||
    status === "purchased"
  );
}

export const MAX_ACTIVE_CUSTOMER_ORDERS = 2;
export const ACTIVE_ORDER_LIMIT_MESSAGE =
  "You already have 2 active orders. Please wait for them to be completed.";

export function formatOrderPlacedAt(date: Date | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return "Order placed";
  const time = date.toLocaleTimeString("en-HK", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `Order placed at ${time}`;
}

export const RUNNER_EARNINGS_RATE = 0.7;

export function runnerEarningsForOrder(deliveryFee: number): number {
  return Math.round(deliveryFee * RUNNER_EARNINGS_RATE * 100) / 100;
}

export function hasConfirmedGroceryTotal(order: {
  amountPaidByRunner?: number;
  finalTotal?: number;
  actualSubtotal?: number;
}): boolean {
  return (
    order.amountPaidByRunner != null ||
    order.finalTotal != null ||
    order.actualSubtotal != null
  );
}

export function groceryAmountDue(order: {
  amountPaidByRunner?: number;
  finalTotal?: number;
  actualSubtotal?: number;
  subtotal: number;
}): number {
  return (
    order.amountPaidByRunner ??
    order.finalTotal ??
    order.actualSubtotal ??
    order.subtotal
  );
}

export function customerAmountDue(order: {
  amountPaidByRunner?: number;
  finalTotal?: number;
  actualSubtotal?: number;
  subtotal: number;
  deliveryFee: number;
  tip?: number;
}): number {
  return (
    Math.round(
      (groceryAmountDue(order) + order.deliveryFee + (order.tip ?? 0)) * 100,
    ) / 100
  );
}

export function runnerReimburseTotal(order: {
  amountPaidByRunner?: number;
  finalTotal?: number;
  actualSubtotal?: number;
  subtotal: number;
  deliveryFee: number;
}): number {
  return (
    Math.round((groceryAmountDue(order) + order.deliveryFee) * 100) / 100
  );
}

export function adminPayoutLabel(status: OrderStatus): string {
  if (status === "delivered") return "pending_payout";
  if (status === "runner_paid") return "runner_paid";
  if (status === "customer_paid" || status === "completed") return "customer_paid";
  return status;
}

export const CUSTOMER_PAY_REMINDER_MS = 2 * 60 * 60 * 1000;
export const CUSTOMER_PAY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const RUNNER_DELIVERY_WINDOW_MS = 3 * 60 * 60 * 1000;
export const RUNNER_DEADLINE_REMINDER_MS = 30 * 60 * 1000;
export const CUSTOMER_DEADLINE_REMINDER_MS = 2 * 60 * 60 * 1000;

export const RUNNER_DEADLINE_WARNING =
  "Orders must be delivered within 3 hours. Repeated delays may result in disciplinary action to your CUHK email account.";

export const EXPIRED_DELIVERIES_NOTICE =
  "Orders that expired. Repeated expirations may result in disciplinary action to your CUHK email account.";

export const CUSTOMER_DEADLINE_WARNING =
  "Payment is due within 24 hours. Repeated non-payment may result in disciplinary action to your CUHK email account.";

export function formatRemaining(ms: number): string {
  if (ms <= 0) return "0h 0m";
  const totalMin = Math.floor(ms / 60_000);
  return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
}

export function runnerDeadlineOf(order: {
  runnerDeadline?: Date;
  acceptedAt?: Date;
}): Date | undefined {
  if (order.runnerDeadline) return order.runnerDeadline;
  if (order.acceptedAt) {
    return new Date(order.acceptedAt.getTime() + RUNNER_DELIVERY_WINDOW_MS);
  }
  return undefined;
}

export function customerDeadlineOf(order: {
  customerDeadline?: Date;
  deliveredAt?: Date;
}): Date | undefined {
  if (order.customerDeadline) return order.customerDeadline;
  if (order.deliveredAt) {
    return new Date(order.deliveredAt.getTime() + CUSTOMER_PAY_WINDOW_MS);
  }
  return undefined;
}

export function isRunnerDeliveryOpen(status: OrderStatus): boolean {
  return status === "accepted" || status === "purchased";
}

export function isRunnerHoldStatus(status: OrderStatus): boolean {
  return isRunnerDeliveryOpen(status);
}

/** Still assigned to the runner, but past the 3-hour delivery window. */
export function isRunnerDeliveryExpired(
  order: {
    status: OrderStatus;
    runnerDeadline?: Date;
    acceptedAt?: Date;
    runnerExpiredAt?: Date;
  },
  now = Date.now(),
): boolean {
  if (!isRunnerHoldStatus(order.status)) return false;
  if (order.runnerExpiredAt) return true;
  const due = runnerDeadlineOf(order);
  return Boolean(due && now >= due.getTime());
}

export function runnerExpiredAtOf(
  order: {
    runnerExpiredAt?: Date;
    runnerDeadline?: Date;
    acceptedAt?: Date;
  },
  now = Date.now(),
): Date | undefined {
  if (order.runnerExpiredAt) return order.runnerExpiredAt;
  const due = runnerDeadlineOf(order);
  if (due && now >= due.getTime()) return due;
  return undefined;
}

export function formatExpiredAgo(at: Date, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - at.getTime()) / 60_000));
  if (minutes < 1) return "Expired just now";
  if (minutes < 60) return `Expired ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `Expired ${hours}h ago`;
  return `Expired ${Math.floor(hours / 24)}d ago`;
}

/** Warnings already recorded, counting an unsynced expiry as one. */
export function runnerWarningTotal(
  orders: {
    status: OrderStatus;
    runnerDeadline?: Date;
    acceptedAt?: Date;
    runnerExpiredAt?: Date;
    runnerWarningCount?: number;
  }[],
  now = Date.now(),
): number {
  return orders.reduce((sum, order) => {
    const recorded = order.runnerWarningCount ?? 0;
    const expired = isRunnerDeliveryExpired(order, now);
    return sum + Math.max(recorded, expired ? 1 : 0);
  }, 0);
}

/** Post-delivery PayMe/FPS UI — skipped when the customer already paid online. */
export function isCustomerPaymentOpen(
  status: OrderStatus,
  order?: { paymentReceived?: boolean; paymentProvider?: string },
): boolean {
  if (order?.paymentReceived && order.paymentProvider === "airwallex") {
    return false;
  }
  if (status === "paid" || status === "completed" || status === "customer_paid") {
    return false;
  }
  return status === "delivered" || status === "runner_paid";
}

/** Orders runners may claim from the available board. */
export function isClaimableOrderStatus(status: OrderStatus): boolean {
  return status === "paid";
}
