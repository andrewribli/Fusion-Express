import type { Order } from "./types";

/** Hours the customer has to pay GraceRun after delivery. */
export const PAYMENT_WINDOW_HOURS = 24;

/** Hours after delivery when the first "still unpaid" reminder is sent. */
export const PAYMENT_REMINDER_HOURS = 12;

export type PaymentMethod = "PayMe" | "FPS";

export interface PaymentAccount {
  method: PaymentMethod;
  /** Handle / phone / FPS ID the customer sends money to. */
  id: string;
  /** Optional deep link (e.g. a PayMe payment link). */
  link?: string;
  /** Short instruction shown under the account id. */
  hint: string;
}

function env(name: string): string | undefined {
  const value = typeof process !== "undefined" ? process.env[name] : undefined;
  return value && value.trim() ? value.trim() : undefined;
}

/** Same GraceRun payout account for Next (NEXT_PUBLIC_*) and Expo (EXPO_PUBLIC_*). */
function paymentEnv(suffix: string): string | undefined {
  return (
    env(`EXPO_PUBLIC_GRACERUN_${suffix}`) ??
    env(`NEXT_PUBLIC_GRACERUN_${suffix}`)
  );
}

// Placeholder handles used until the owner sets the real account via env vars.
const DEFAULT_PAYME_ID = "@gracerun";
const DEFAULT_FPS_ID = "163-456-789";

/**
 * The account(s) customers pay GraceRun to. Configure the real values with
 * NEXT_PUBLIC_GRACERUN_PAYME_ID / _FPS_ID (and optional _PAYME_LINK).
 */
export function getGraceRunPaymentAccounts(): PaymentAccount[] {
  const paymeId = paymentEnv("PAYME_ID") ?? DEFAULT_PAYME_ID;
  const paymeLink = paymentEnv("PAYME_LINK");
  const fpsId = paymentEnv("FPS_ID") ?? DEFAULT_FPS_ID;
  return [
    {
      method: "PayMe",
      id: paymeId,
      link: paymeLink,
      hint: "Open PayMe and pay this handle.",
    },
    {
      method: "FPS",
      id: fpsId,
      hint: "Transfer via FPS to this ID.",
    },
  ];
}

export type PaymentState = "not_due" | "due" | "overdue" | "paid";

/** When the order was (or counts as) delivered. */
function deliveredTime(order: Order): Date | null {
  if (order.deliveredAt) return order.deliveredAt;
  if (order.status === "delivered") return order.updatedAt ?? null;
  return null;
}

/** Deadline for the customer to pay: delivery time + PAYMENT_WINDOW_HOURS. */
export function paymentDueAt(order: Order): Date | null {
  const delivered = deliveredTime(order);
  if (!delivered) return null;
  return new Date(delivered.getTime() + PAYMENT_WINDOW_HOURS * 3_600_000);
}

/** Current payment lifecycle state for an order. */
export function paymentState(order: Order, now: Date = new Date()): PaymentState {
  if (order.paymentReceived) return "paid";
  const delivered = deliveredTime(order);
  if (!delivered) return "not_due";
  const due = paymentDueAt(order);
  if (due && now.getTime() > due.getTime()) return "overdue";
  return "due";
}

/** True when the order is delivered and still awaiting payment. */
export function isPaymentOutstanding(order: Order, now: Date = new Date()): boolean {
  const state = paymentState(order, now);
  return state === "due" || state === "overdue";
}

/**
 * The exact receipt total is only known once the runner submits the Fusion
 * till prices. Before that, the amount shown is an estimate.
 */
export function isExactAmountConfirmed(order: Order): boolean {
  return Boolean(order.tillPricesSubmittedAt);
}

/** Amount the customer needs to pay GraceRun. */
export function amountToPay(order: Order): number {
  return order.total;
}

/** Milliseconds left before the payment deadline (negative once overdue). */
export function msUntilPaymentDue(
  order: Order,
  now: Date = new Date(),
): number | null {
  const due = paymentDueAt(order);
  if (!due) return null;
  return due.getTime() - now.getTime();
}

/** Human-readable countdown like "23h 05m" (clamped at zero). */
export function formatCountdown(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalMinutes = Math.floor(clamped / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}
