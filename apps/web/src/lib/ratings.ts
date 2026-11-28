import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { submitOrderRating } from "@/lib/orders";

const mockRatings = new Map<string, number>();

export type SaveOrderRatingInput = {
  rating: number;
  feedback?: string;
  tipAmount?: number;
};

export async function saveOrderRating(
  orderId: string,
  ratingOrInput: number | SaveOrderRatingInput,
  customerId: string,
): Promise<void> {
  const input: SaveOrderRatingInput =
    typeof ratingOrInput === "number"
      ? { rating: ratingOrInput }
      : ratingOrInput;
  if (input.rating < 1 || input.rating > 5) throw new Error("Rating must be 1–5");

  const payload = {
    orderId,
    rating: input.rating,
    feedback: input.feedback?.trim() || null,
    tipAmount: Math.max(0, Number(input.tipAmount ?? 0)) || null,
    customerId,
    createdAt: new Date(),
  };

  if (isFirebaseConfigured()) {
    try {
      await setDoc(doc(getDb(), "ratings", orderId), {
        ...payload,
        createdAt: Timestamp.fromDate(payload.createdAt),
      });
      await submitOrderRating(orderId, {
        rating: input.rating,
        feedback: input.feedback,
        tipAmount: input.tipAmount,
      });
      mockRatings.set(orderId, input.rating);
      return;
    } catch {
      // fallback
    }
  }

  mockRatings.set(orderId, input.rating);
  await submitOrderRating(orderId, {
    rating: input.rating,
    feedback: input.feedback,
    tipAmount: input.tipAmount,
  });
}

export function getMockRating(orderId: string): number | undefined {
  return mockRatings.get(orderId);
}

/** True when the customer already rated (don't re-prompt). */
export function orderHasRating(order: {
  rating?: number;
  runnerRating?: number;
  ratedAt?: Date;
}): boolean {
  return Boolean(order.ratedAt || order.rating || order.runnerRating);
}
