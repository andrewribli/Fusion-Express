import type { Order, OrderStatus } from "@/lib/types";
import type {
  AdminChatMessage,
  AdminChatRole,
  AdminChatThread,
} from "@/lib/admin-chat";
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

// ---- Admin chat notifications ----------------------------------------------

const CHAT_NOTIFIED_KEY = "gracerun_chat_notified";

function readNotifiedIds(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(CHAT_NOTIFIED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveNotifiedIds(ids: Set<string>): void {
  if (typeof localStorage === "undefined") return;
  try {
    // Keep the set bounded so it does not grow forever.
    localStorage.setItem(CHAT_NOTIFIED_KEY, JSON.stringify([...ids].slice(-500)));
  } catch {
    // best-effort dedupe only
  }
}

/**
 * Notify the viewer about new admin-chat messages authored by the other side.
 * Admins are alerted to customer/runner messages; customers and runners are
 * alerted to admin replies. De-duplicated per message id.
 */
export function notifyNewAdminMessages(
  messages: AdminChatMessage[],
  viewerRole: AdminChatRole,
): void {
  if (!canNotify()) return;
  const notified = readNotifiedIds();
  let changed = false;
  for (const msg of messages) {
    if (msg.senderRole === viewerRole) continue;
    if (notified.has(msg.id)) continue;
    const label =
      viewerRole === "admin"
        ? `${msg.senderName} (${msg.party}) · ${msg.orderId}`
        : `GraceRun · ${msg.orderId}`;
    const body = msg.message || (msg.imageUrl ? "📷 Photo" : "");
    show(`${label}: ${body}`, `admin-chat-${msg.id}`);
    notified.add(msg.id);
    changed = true;
  }
  if (changed) saveNotifiedIds(notified);
}

/**
 * Admin-dashboard notification for a thread that just received a message from a
 * customer or runner. The tag includes the update time so the same activity is
 * not shown twice.
 */
export function notifyAdminThreadActivity(thread: AdminChatThread): void {
  if (!canNotify()) return;
  const who = thread.party === "customer" ? "Customer" : "Runner";
  show(
    `${who} · ${thread.orderId}: ${thread.lastMessage || "New message"}`,
    `admin-thread-${thread.id}-${thread.updatedAt.getTime()}`,
  );
}
