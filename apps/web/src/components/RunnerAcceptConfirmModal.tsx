"use client";

import { useEffect } from "react";
import { formatDeliveryAddress } from "@/data/cuhk-locations";
import type { Order } from "@/lib/types";

export function RunnerAcceptConfirmModal({
  order,
  loading,
  onConfirm,
  onCancel,
}: {
  order: Order | null;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!order) return;
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
  }, [order, loading, onCancel]);

  if (!order) return null;

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="w-full max-w-[480px] rounded-2xl bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="accept-confirm-title"
      >
        <h2 id="accept-confirm-title" className="text-lg font-bold text-gray-900">
          Are you sure you want to accept this order?
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          You pick up at Fusion without paying — GraceRun settles the grocery bill.
          Then deliver to the lobby and take a photo.
        </p>
        <div className="mt-4 rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-700">
          <p className="font-medium text-gray-900">
            {formatDeliveryAddress(order.college, order.hall)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {itemCount} item{itemCount === 1 ? "" : "s"} · Lobby: {order.lobbyPoint}
          </p>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-[#ED1C24] py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Accepting…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
