"use client";

import { useState } from "react";
import { saveOrderRating } from "@/lib/ratings";

interface RatingModalProps {
  orderId: string;
  customerId: string;
  runnerName?: string;
  onDone: (rating: number) => void;
}

export function RatingModal({
  orderId,
  customerId,
  runnerName,
  onDone,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (rating < 1) return;
    setSubmitting(true);
    await saveOrderRating(orderId, rating, customerId);
    onDone(rating);
    setSubmitting(false);
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">Rate your runner</h3>
      <p className="mt-1 text-xs text-gray-500">
        How was {runnerName ?? "your runner"}?
      </p>
      <div className="mt-3 flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={`text-3xl ${star <= rating ? "text-amber-400" : "text-gray-300"}`}
            aria-label={`${star} stars`}
          >
            ★
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={rating < 1 || submitting}
        className="mt-4 w-full rounded-xl bg-fusion-red py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        Submit Rating
      </button>
    </div>
  );
}
