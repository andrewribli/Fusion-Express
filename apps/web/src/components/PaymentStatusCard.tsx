"use client";

import { useEffect, useState } from "react";
import { PayNowModal } from "@/components/PayNowModal";
import { PaymentMethods } from "@/components/PaymentMethods";
import {
  amountToPay,
  formatCountdown,
  isExactAmountConfirmed,
  msUntilPaymentDue,
  paymentState,
} from "@/lib/payments";
import type { Order } from "@/lib/types";

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function formatPaidAt(date?: Date): string {
  if (!date) return "";
  return date.toLocaleString("en-HK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Shows a customer where their payment stands for an order. Use `compact` for
 * list rows (order history / profile) and the full card on the tracking page.
 */
export function PaymentStatusCard({
  order,
  onPaid,
  compact = false,
}: {
  order: Order;
  onPaid?: () => void;
  compact?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const state = paymentState(order);
  const now = useNow(state === "due");
  const amount = amountToPay(order);

  const msLeft = msUntilPaymentDue(order, new Date(now));
  const countdown = msLeft != null ? formatCountdown(msLeft) : null;
  const exact = isExactAmountConfirmed(order);

  const modal = (
    <PayNowModal
      order={order}
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      onPaid={() => onPaid?.()}
    />
  );

  if (state === "paid") {
    if (compact) {
      return (
        <p className="text-xs font-semibold text-green-700">
          Payment received ✅
        </p>
      );
    }
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
        <p className="text-sm font-bold text-green-800">Payment received ✅</p>
        <p className="mt-1 text-xs text-green-700">
          Thanks! You paid ${amount}
          {order.paymentMethod ? ` via ${order.paymentMethod}` : ""}
          {order.paidAt ? ` on ${formatPaidAt(order.paidAt)}` : ""}.
        </p>
      </div>
    );
  }

  if (state === "not_due") {
    if (compact) {
      return (
        <p className="text-xs font-medium text-gray-500">
          Payment due after delivery
        </p>
      );
    }
    return (
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm font-bold text-blue-900">
          Payment due after delivery
        </p>
        <p className="mt-1 text-xs text-blue-800">
          No payment needed now. You&apos;ll pay GraceRun within 24 hours after
          your groceries arrive — we&apos;ll remind you.
        </p>
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-900/70">
            You&apos;ll pay via
          </p>
          <PaymentMethods className="mt-2" />
        </div>
      </div>
    );
  }

  // due or overdue
  const overdue = state === "overdue";

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div>
          <p
            className={`text-xs font-semibold ${
              overdue ? "text-red-700" : "text-amber-700"
            }`}
          >
            {overdue ? "Payment overdue" : "Payment due"} · ${amount}
          </p>
          {!overdue && countdown && (
            <p className="text-[11px] text-gray-500">Pay within {countdown}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-fusion-red px-3 py-1.5 text-xs font-semibold text-white"
        >
          Pay Now
        </button>
        {modal}
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        overdue ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className={`text-base font-bold ${
              overdue ? "text-red-800" : "text-amber-900"
            }`}
          >
            {overdue ? "Payment overdue" : "Pay GraceRun now"}
          </p>
          <p className="mt-0.5 text-xs text-gray-600">
            {exact
              ? "Amount confirmed from the Fusion receipt."
              : "Estimate — final amount confirmed at pickup."}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">
            Amount
          </p>
          <p className="text-2xl font-bold text-fusion-red">${amount}</p>
        </div>
      </div>

      <div
        className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${
          overdue ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"
        }`}
      >
        {overdue
          ? "Please pay now — your 24-hour window has passed."
          : `Pay within 24 hours · ${countdown} left`}
      </div>

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="mt-3 w-full rounded-xl bg-fusion-red py-3 text-sm font-semibold text-white"
      >
        Pay Now
      </button>

      {modal}
    </div>
  );
}
