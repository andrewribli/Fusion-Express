import { collegeLabel } from "@/ptero/config/canteen/colleges";
import { readJson, STORAGE_KEYS, writeJson } from "@/ptero/lib/storage";
import type { CustomerNotification, Order } from "@/ptero/lib/types";

export function listNotifications(userId?: string | null): CustomerNotification[] {
  const all = readJson<CustomerNotification[]>(STORAGE_KEYS.notifications, []);
  if (!userId) return [];
  return all
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadNotificationCount(userId?: string | null): number {
  return listNotifications(userId).filter((n) => !n.read).length;
}

export function markNotificationRead(id: string): void {
  const all = readJson<CustomerNotification[]>(STORAGE_KEYS.notifications, []);
  writeJson(
    STORAGE_KEYS.notifications,
    all.map((n) => (n.id === id ? { ...n, read: true } : n)),
  );
}

export function markAllNotificationsRead(userId: string): void {
  const all = readJson<CustomerNotification[]>(STORAGE_KEYS.notifications, []);
  writeJson(
    STORAGE_KEYS.notifications,
    all.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
  );
}

type EmailOutboxEntry = {
  id: string;
  to: string;
  subject: string;
  body: string;
  createdAt: string;
  orderId?: string;
};

function pushEmail(entry: Omit<EmailOutboxEntry, "id" | "createdAt">): void {
  const box = readJson<EmailOutboxEntry[]>(STORAGE_KEYS.emailOutbox, []);
  writeJson(STORAGE_KEYS.emailOutbox, [
    {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    },
    ...box,
  ]);
}

function pushNotification(
  partial: Omit<CustomerNotification, "id" | "createdAt" | "read">,
): CustomerNotification {
  const notification: CustomerNotification = {
    ...partial,
    id: crypto.randomUUID(),
    read: false,
    createdAt: new Date().toISOString(),
  };
  const all = readJson<CustomerNotification[]>(STORAGE_KEYS.notifications, []);
  writeJson(STORAGE_KEYS.notifications, [notification, ...all]);
  return notification;
}

/** Prototype notify + email mirror (no Resend yet). */
export function notifyDiscountReceived(opts: {
  order: Order;
  runnerCollege: string | null | undefined;
}): CustomerNotification | null {
  const userId = opts.order.customerId;
  if (!userId) return null;

  const label = collegeLabel(opts.runnerCollege) || "your residence";
  const title = "Discount received!";
  const body = `Your runner is from ${label}, so you got 10% off your canteen order.`;
  const emailSubject = "You got a 10% discount!";
  const emailTo = opts.order.customerEmail ?? undefined;

  const notification = pushNotification({
    userId,
    type: "discount_received",
    title,
    body,
    orderId: opts.order.id,
    href: `/cityu/track/${opts.order.id}`,
    accent: "gold",
    emailSubject,
    emailTo,
  });

  if (emailTo) {
    pushEmail({
      to: emailTo,
      subject: emailSubject,
      body: `${title}\n\n${body}\n\nOrder ${opts.order.id}`,
      orderId: opts.order.id,
    });
  }

  return notification;
}

export function notifyOrderStatus(opts: {
  order: Order;
  event: "accepted" | "purchased" | "delivered" | "paid";
}): CustomerNotification | null {
  const userId = opts.order.customerId;
  if (!userId) return null;

  const copy = {
    accepted: {
      title: "Runner accepted",
      body: `${opts.order.runnerName ?? "A runner"} accepted your order and is on the way to pick up.`,
      accent: "green" as const,
    },
    purchased: {
      title: "Picked up",
      body: "Your order was picked up and is heading to your hall lobby.",
      accent: "green" as const,
    },
    delivered: {
      title: "Delivered",
      body: `Dropped at ${opts.order.lobby}. You can pay now.`,
      accent: "green" as const,
    },
    paid: {
      title: "Payment received",
      body: "Thanks — your order is fully settled.",
      accent: "gold" as const,
    },
  };

  const msg = copy[opts.event];
  return pushNotification({
    userId,
    type: "order_update",
    title: msg.title,
    body: msg.body,
    orderId: opts.order.id,
    href: `/cityu/track/${opts.order.id}`,
    accent: msg.accent,
  });
}
