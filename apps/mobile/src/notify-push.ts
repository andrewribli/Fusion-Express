import { getAuthClient } from "@fusion-express/shared/firebase";
import { webAssetOrigin } from "@fusion-express/shared/products";

/** Ask the live API to buzz the other phone. Never blocks checkout or chat. */
export function notifyOrderEvent(
  orderId: string,
  event: "created" | "accepted" | "chat",
  preview?: string,
): void {
  void (async () => {
    try {
      const user = getAuthClient().currentUser;
      if (!user || !orderId) return;
      const token = await user.getIdToken();
      const res = await fetch(`${webAssetOrigin()}/api/push/order-event`, {
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
        const text = await res.text().catch(() => "");
        console.warn("[push] notify failed", res.status, text.slice(0, 180));
      }
    } catch (err) {
      console.warn("[push] notify failed", err);
    }
  })();
}
