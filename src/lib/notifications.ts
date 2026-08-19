import type { OrderStatus } from "@/lib/types";

const STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  assigned: "A runner has accepted your order!",
  picked: "Your groceries have been picked up and are on the way.",
  delivered: "Your order has been delivered. Enjoy!",
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

  new Notification("Fusion Express", {
    body: `${orderId}: ${body}`,
    icon: "https://upload.wikimedia.org/wikipedia/commons/9/9a/Fusion_logo.svg",
    tag: `order-${orderId}-${status}`,
  });
}
