"use client";

import { useEffect } from "react";
import { RunnerOrderDetails } from "@/components/RunnerOrderDetails";
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
  useEffect(() => {
    if (!order) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [order, onClose]);

  if (!order) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[480px] flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="runner-order-preview-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-100 px-5 py-4">
          <h2
            id="runner-order-preview-title"
            className="text-lg font-bold text-gray-900"
          >
            Full order
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">{order.id}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <RunnerOrderDetails order={order} />
        </div>
        <div className="flex gap-3 border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700"
          >
            Close
          </button>
          {onAccept && (
            <button
              type="button"
              onClick={onAccept}
              className="flex-1 rounded-xl bg-[#ED1C24] py-3 text-sm font-semibold text-white"
            >
              Accept Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
