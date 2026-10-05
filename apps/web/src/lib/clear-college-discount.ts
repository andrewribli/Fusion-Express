import { getAuthClient } from "@/lib/firebase";

/** Clears platformDiscountFee after the order is cancelled. */
export async function clearCollegeDiscountAfterCancel(orderId: string): Promise<void> {
  const token = await getAuthClient().currentUser?.getIdToken();
  if (!token) return;
  await fetch("/api/orders/clear-college-discount", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId }),
  });
}
