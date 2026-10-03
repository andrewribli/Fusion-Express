import { getAuthClient, isFirebaseConfigured } from "@/lib/firebase";

async function authHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (!isFirebaseConfigured()) return headers;
  const user = getAuthClient().currentUser;
  if (!user) return headers;
  try {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  } catch (err) {
    console.error("Could not get ID token for canteen notify", err);
  }
  return headers;
}

/** Fire-and-forget canteen customer notification + email. */
export async function notifyCanteenEvent(opts: {
  orderId: string;
  event: "discount_received" | "picked_up";
}): Promise<void> {
  try {
    const res = await fetch("/api/canteen/notify", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({
        orderId: opts.orderId,
        event: opts.event,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("canteen notify failed", res.status, text);
    }
  } catch (err) {
    console.error("canteen notify failed", err);
  }
}
