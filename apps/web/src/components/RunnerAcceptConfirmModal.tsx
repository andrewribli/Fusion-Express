"use client";

import { formatDeliveryAddress } from "@/data/cuhk-locations";
import { runnerEarningsForOrder } from "@/lib/order-status";
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
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-lg font-bold text-gray-900">Accept this order?</h2>
        <p className="mt-2 text-sm text-gray-600">
          Deliver to {formatDeliveryAddress(order.college, order.hall)}. Estimated
          groceries ${order.subtotal}. You earn $
          {runnerEarningsForOrder(order.deliveryFee)}.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="min-h-11 flex-1 rounded-xl bg-[#ED1C24] text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? "Accepting…" : "Confirm accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
