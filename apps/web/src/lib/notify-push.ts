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
