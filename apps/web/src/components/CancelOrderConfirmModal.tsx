"use client";

import { useEffect } from "react";

export function CancelOrderConfirmModal({
  open,
  loading,
  onConfirm,
  onDismiss,
}: {
  open: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, loading, onDismiss]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="w-full max-w-[480px] rounded-2xl bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-order-title"
      >
        <h2 id="cancel-order-title" className="text-lg font-bold text-gray-900">
          Cancel this order?
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          You can cancel before the runner picks up your order. This cannot be
          undone.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onDismiss}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 disabled:opacity-60"
          >
            Keep order
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-[#ED1C24] py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Cancelling…" : "Yes, cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
