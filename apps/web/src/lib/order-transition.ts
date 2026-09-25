import { getAuthClient } from "@/lib/firebase";

export async function postOrderTransition(opts: {
  orderId: string;
  to: string;
  receiptUrl?: string;
  receiptAmount?: number;
  dropoffPhotoUrl?: string;
}): Promise<void> {
  const user = getAuthClient().currentUser;
  if (!user) throw new Error("Sign in required.");
  const token = await user.getIdToken();
  const res = await fetch("/api/orders/transition", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(opts),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error || "Could not update this order.");
  }
}
