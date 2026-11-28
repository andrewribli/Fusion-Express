"use client";

import { useState } from "react";
import { TIP_PRESETS } from "@/lib/constants";
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
  const [feedback, setFeedback] = useState("");
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [thanks, setThanks] = useState(false);

  const tipAmount = Math.max(
    0,
    customTip.trim() ? Number(customTip) || 0 : tip,
  );

  async function handleSubmit() {
    if (rating < 1) return;
    setSubmitting(true);
    setError("");
    try {
      await saveOrderRating(
        orderId,
        {
          rating,
          feedback: feedback.trim() || undefined,
          tipAmount: tipAmount > 0 ? tipAmount : undefined,
        },
        customerId,
      );
      setThanks(true);
      onDone(rating);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save rating.");
    } finally {
      setSubmitting(false);
    }
  }

  if (thanks) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-emerald-900">Thank you!</h3>
        <p className="mt-1 text-xs text-emerald-800">
          Your feedback helps runners improve.{" "}
          {tipAmount > 0
            ? `A HK$${tipAmount} tip was recorded for your runner.`
            : null}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">Rate your delivery</h3>
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

      <label className="mt-4 block text-xs font-semibold text-gray-600">
        Feedback (optional)
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value.slice(0, 1000))}
          rows={3}
          placeholder="Anything we should know?"
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#ED1C24]"
        />
      </label>

      <div className="mt-4">
        <p className="text-xs font-semibold text-gray-600">
          Tip your runner (optional, HK$)
        </p>
        <p className="mt-0.5 text-[11px] text-gray-500">
          Tips are paid to the runner with their weekly payout — no extra charge
          in-app.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {TIP_PRESETS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => {
                setTip(amount);
                setCustomTip("");
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                !customTip && tip === amount
                  ? "bg-[#ED1C24] text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {amount === 0 ? "No tip" : `$${amount}`}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={0}
          max={500}
          step={1}
          inputMode="decimal"
          placeholder="Custom amount"
          value={customTip}
          onChange={(e) => setCustomTip(e.target.value)}
          className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#ED1C24]"
        />
      </div>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={rating < 1 || submitting}
        className="mt-4 w-full rounded-xl bg-fusion-red py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit rating"}
      </button>
    </div>
  );
}
