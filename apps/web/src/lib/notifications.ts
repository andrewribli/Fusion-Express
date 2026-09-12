import type { Order, OrderStatus } from "@/lib/types";
import {
  PAYMENT_REMINDER_HOURS,
  PAYMENT_WINDOW_HOURS,
  amountToPay,
} from "@/lib/payments";

const STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  assigned: "A runner has accepted your order!",
  picked: "Your groceries have been picked up and are on the way.",
  // "delivered" intentionally omitted — delivery triggers a payment reminder
  // (see notifyPaymentReminder) so the customer knows to pay GraceRun.
};

const APP_NAME = "GraceRun";
const APP_ICON = "/images/gracerun-icon.png";

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function canNotify(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  );
}

function show(body: string, tag: string): void {
  if (!canNotify()) return;
  new Notification(APP_NAME, { body, icon: APP_ICON, tag });
}

export function notifyOrderStatus(orderId: string, status: OrderStatus): void {
  const body = STATUS_MESSAGES[status];
  if (!body) return;
  show(`${orderId}: ${body}`, `order-${orderId}-${status}`);
}

export type PaymentReminderKind = "arrived" | "reminder" | "final";

function paymentReminderBody(order: Order, kind: PaymentReminderKind): string {
  const amount = `$${amountToPay(order)}`;
  switch (kind) {
    case "arrived":
      return `Your order has arrived! Please pay GraceRun ${amount} within ${PAYMENT_WINDOW_HOURS} hours.`;
    case "reminder":
      return `Reminder: your GraceRun payment of ${amount} is still due. Please pay within ${PAYMENT_WINDOW_HOURS} hours of delivery.`;
    case "final":
      return `Final reminder: your GraceRun payment of ${amount} is now due. Please pay now via PayMe or FPS.`;
  }
}

export function notifyPaymentReminder(
  order: Order,
  kind: PaymentReminderKind,
): void {
  show(`${order.id}: ${paymentReminderBody(order, kind)}`, `pay-${order.id}-${kind}`);
}

const SENT_KEY = "gracerun_payment_reminders";

function readSent(): Record<string, PaymentReminderKind[]> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(SENT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PaymentReminderKind[]>) : {};
  } catch {
    return {};
  }
}

function markSent(orderId: string, kind: PaymentReminderKind): void {
  if (typeof localStorage === "undefined") return;
  const all = readSent();
  const kinds = new Set(all[orderId] ?? []);
  kinds.add(kind);
  all[orderId] = [...kinds];
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(all));
  } catch {
    // best-effort dedupe only
  }
}

/**
 * Fire delivery/payment reminders while the app is open. Because there is no
 * server-side scheduler in the MVP, reminders are only sent when the customer
 * has the app open and has granted notification permission. Each reminder is
 * de-duplicated per order via localStorage so it is sent at most once.
 *
 *  - "arrived": as soon as the order is delivered.
 *  - "reminder": once ≥12h have passed since delivery and it is still unpaid.
 *  - "final": once ≥24h have passed since delivery and it is still unpaid.
 */
export function maybeSendPaymentReminders(order: Order): void {
  if (!canNotify()) return;
  if (order.paymentReceived) return;
  const deliveredAt =
    order.deliveredAt ?? (order.status === "delivered" ? order.updatedAt : null);
  if (!deliveredAt) return;

  const hoursSince = (Date.now() - deliveredAt.getTime()) / 3_600_000;
  const sent = new Set(readSent()[order.id] ?? []);

  if (!sent.has("arrived")) {
    notifyPaymentReminder(order, "arrived");
    markSent(order.id, "arrived");
  }
  if (hoursSince >= PAYMENT_REMINDER_HOURS && !sent.has("reminder")) {
    notifyPaymentReminder(order, "reminder");
    markSent(order.id, "reminder");
  }
  if (hoursSince >= PAYMENT_WINDOW_HOURS && !sent.has("final")) {
    notifyPaymentReminder(order, "final");
    markSent(order.id, "final");
  }
}
