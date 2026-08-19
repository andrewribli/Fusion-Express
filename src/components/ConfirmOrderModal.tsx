"use client";

import { formatDeliveryAddress, getLobbyForHall } from "@/data/cuhk-locations";
import { formatEta } from "@/lib/constants";
import { DELIVERY_FEE } from "@/lib/types";

interface ConfirmOrderModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  tip: number;
  college: string;
  hall: string;
  roomNumber?: string;
  customerNote?: string;
  estimatedDeliveryAt: Date;
}

export function ConfirmOrderModal({
  open,
  onConfirm,
  onCancel,
  loading,
  items,
  subtotal,
  tip,
  college,
  hall,
  roomNumber,
  customerNote,
  estimatedDeliveryAt,
}: ConfirmOrderModalProps) {
  if (!open) return null;

  const total = subtotal + DELIVERY_FEE + tip;
  const address = formatDeliveryAddress(college, hall, roomNumber);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="w-full max-w-[480px] rounded-2xl bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h2 id="confirm-title" className="text-lg font-bold text-gray-900">
          Are you sure?
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Review your order before confirming.
        </p>

        <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto text-sm text-gray-700">
          {items.map((item) => (
            <li key={item.name} className="flex justify-between">
              <span>
                {item.quantity}× {item.name}
              </span>
              <span>${item.price * item.quantity}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-sm">
          <p className="font-medium text-gray-900">{address}</p>
          <p className="text-xs text-gray-500">Lobby: {getLobbyForHall(hall)}</p>
          {customerNote && (
            <p className="mt-1 text-xs text-gray-600">Note: {customerNote}</p>
          )}
        </div>

        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${subtotal}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Delivery fee</span>
            <span>${DELIVERY_FEE}</span>
          </div>
          {tip > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tip</span>
              <span>${tip}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
            <span>Total</span>
            <span>${total}</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-fusion-red">
          Est. delivery by {formatEta(estimatedDeliveryAt)} (~30 min)
        </p>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-fusion-red py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Placing…" : "Confirm Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
