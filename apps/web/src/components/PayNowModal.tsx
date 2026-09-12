"use client";

import { useState } from "react";
import { PaymentMethods } from "@/components/PaymentMethods";
import { markPaymentReceived } from "@/lib/orders";
import {
  amountToPay,
  isExactAmountConfirmed,
  getGraceRunPaymentAccounts,
  type PaymentMethod,
} from "@/lib/payments";
import type { Order } from "@/lib/types";

export function PayNowModal({
  order,
  open,
  onClose,
  onPaid,
}: {
  order: Order;
  open: boolean;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const amount = amountToPay(order);
  const exact = isExactAmountConfirmed(order);
  const methods = getGraceRunPaymentAccounts().map((a) => a.method);

  async function handleConfirm() {
    setSaving(true);
    setError("");
    try {
      await markPaymentReceived(order.id, method ?? undefined);
      onPaid();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not record payment. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="w-full max-w-[480px] rounded-2xl bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-title"
      >
        <h2 id="pay-title" className="text-lg font-bold text-gray-900">
          Pay GraceRun
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Order {order.id} · pay within 24 hours of delivery.
        </p>

        <div className="mt-4 rounded-xl bg-fusion-red/5 px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Amount to pay
          </p>
          <p className="text-3xl font-bold text-fusion-red">${amount}</p>
          <p className="mt-1 text-[11px] text-gray-500">
            {exact
              ? "Final amount confirmed from the Fusion receipt."
              : "Estimate — final amount is confirmed at pickup."}
          </p>
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Send payment to
        </p>
        <PaymentMethods showCopy className="mt-2" />

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
          How did you pay?
        </p>
        <div className="mt-2 flex gap-2">
          {methods.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold ${
                method === m
                  ? "border-fusion-red bg-fusion-red text-white"
                  : "border-gray-200 text-gray-700"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700"
          >
            Not yet
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "I've paid"}
          </button>
        </div>
      </div>
    </div>
  );
}
