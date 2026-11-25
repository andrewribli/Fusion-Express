import { getAuthClient, isFirebaseConfigured } from "@/lib/firebase";

/** Buzz the other person's phone via Expo. Failures stay in the console. */
export function notifyOrderEvent(
  orderId: string,
  event: "created" | "accepted" | "chat",
  preview?: string,
): void {
  void (async () => {
    try {
      if (!isFirebaseConfigured() || !orderId) return;
      const user = getAuthClient().currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch("/api/push/order-event", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          event,
          preview: preview?.slice(0, 140),
        }),
      });
      if (!res.ok) {
        console.error("push notify failed", res.status, await res.text());
      }
    } catch (err) {
      console.error("push notify failed", err);
    }
  })();
}

/** Customer ↔ admin support chat — buzz admin phones (or the customer on reply). */
export function notifySupportMessage(userId: string, preview?: string): void {
  void (async () => {
    try {
      if (!isFirebaseConfigured() || !userId) return;
      const user = getAuthClient().currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch("/api/push/support-message", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          preview: preview?.slice(0, 140),
        }),
      });
      if (!res.ok) {
        console.error("support push failed", res.status, await res.text());
      }
    } catch (err) {
      console.error("support push failed", err);
    }
  })();
}
