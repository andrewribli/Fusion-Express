export const ORDER_STATUSES = [
  "pending",
  "assigned",
  "picked",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  assigned: "Assigned",
  picked: "Picked Up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Map legacy Firestore values to current statuses */
export function normalizeOrderStatus(status: string): OrderStatus {
  switch (status) {
    case "runner_assigned":
      return "assigned";
    case "picked_up":
      return "picked";
    default:
      return status as OrderStatus;
  }
}

export const TRACKING_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "assigned", label: "Assigned" },
  { status: "picked", label: "Picked Up" },
  { status: "delivered", label: "Delivered" },
];

export function getStepIndex(status: OrderStatus): number {
  const idx = TRACKING_STEPS.findIndex((s) => s.status === status);
  return idx === -1 ? 0 : idx;
}

export const RUNNER_EARNINGS_RATE = 0.7;

export function runnerEarningsForOrder(deliveryFee: number): number {
  return Math.round(deliveryFee * RUNNER_EARNINGS_RATE * 100) / 100;
}
