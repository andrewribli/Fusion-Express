"use client";

import { RunnerOrderDetails } from "@/components/RunnerOrderDetails";
import { runnerEarningsForOrder } from "@/lib/order-status";
import type { Order } from "@/lib/types";

export function RunnerOrderPreviewModal({
  order,
  onClose,
  onAccept,
}: {
  order: Order | null;
  onClose: () => void;
  onAccept?: () => void;
}) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">Order preview</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          You earn ${runnerEarningsForOrder(order.deliveryFee)} delivery fee.
        </p>
        <div className="mt-4">
          <RunnerOrderDetails order={order} />
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700"
          >
            Back
          </button>
          {onAccept ? (
            <button
              type="button"
              onClick={onAccept}
              className="min-h-11 flex-1 rounded-xl bg-[#ED1C24] text-sm font-bold text-white"
            >
              Accept order
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
