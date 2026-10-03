"use client";

import { useEffect } from "react";

export function PlaceOrderConfirmModal({
  open,
  loading,
  deliveryLine,
  totalLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  loading?: boolean;
  deliveryLine?: string | null;
  totalLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="w-full max-w-[480px] rounded-2xl bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="place-order-confirm-title"
      >
        <h2
          id="place-order-confirm-title"
          className="text-lg font-bold text-gray-900"
        >
          Are you sure?
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          We&apos;ll send a runner to shop and deliver to your hall lobby. You
          pay the exact receipt total after delivery.
        </p>
        {deliveryLine ? (
          <div className="mt-4 rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-700">
            <p className="font-medium text-gray-900">{deliveryLine}</p>
            {totalLabel ? (
              <p className="mt-1 text-xs text-gray-500">{totalLabel}</p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 disabled:opacity-60"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-fusion-red py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Placing…" : "Place order"}
          </button>
        </div>
      </div>
    </div>
  );
}
