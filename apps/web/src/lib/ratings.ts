import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { updateOrderRating } from "@/lib/orders";

const mockRatings = new Map<string, number>();

export async function saveOrderRating(
  orderId: string,
  rating: number,
  customerId: string,
): Promise<void> {
  if (rating < 1 || rating > 5) throw new Error("Rating must be 1–5");

  const payload = {
    orderId,
    rating,
    customerId,
    createdAt: new Date(),
  };

  if (isFirebaseConfigured()) {
    try {
      await setDoc(doc(getDb(), "ratings", orderId), {
        ...payload,
        createdAt: Timestamp.fromDate(payload.createdAt),
      });
      await updateOrderRating(orderId, rating);
      return;
    } catch {
      // fallback
    }
  }

  mockRatings.set(orderId, rating);
  await updateOrderRating(orderId, rating);
}

export function getMockRating(orderId: string): number | undefined {
  return mockRatings.get(orderId);
}
