import type { OrderStatus } from "@/lib/types";

const STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  pending: "Order placed — complete payment so a runner can accept it.",
  paid: "Payment received. Waiting for a runner to accept.",
  accepted: "A runner has accepted your order!",
  purchased: "Your groceries have been paid for at Fusion and are on the way.",
  delivered: "Your order has been delivered.",
  runner_paid: "GraceRun reimbursed the runner.",
  completed: "Order complete. Thanks for using GraceRun.",
  customer_paid: "Thanks — you marked this order as paid.",
};

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function notifyOrderStatus(
  orderId: string,
  status: OrderStatus,
): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const body = STATUS_MESSAGES[status];
  if (!body) return;

  new Notification("GraceRun", {
    body: `${orderId}: ${body}`,
    icon: "/images/gracerun-icon.png",
    tag: `order-${orderId}-${status}`,
  });
}
