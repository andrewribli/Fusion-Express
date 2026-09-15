"use client";

import { useEffect, useState } from "react";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import {
  CUSTOMER_PAY_REMINDER_MS,
  customerAmountDue,
} from "@/lib/order-status";
import { ownerPaymentDetails } from "@/lib/owner-payment";
import type { Order } from "@/lib/types";

export function CustomerPayPanel({
  order,
  onMarkPaid,
  marking,
}: {
  order: Order;
  onMarkPaid: () => void;
  marking: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (order.status !== "delivered" && order.status !== "runner_paid") {
    return null;
  }

  const due = customerAmountDue(order);
  const start = order.deliveredAt?.getTime() ?? now;
  const remind = now - start >= CUSTOMER_PAY_REMINDER_MS;
  const owner = ownerPaymentDetails();

  return (
    <section className="rounded-2xl border border-[#ED1C24]/30 bg-red-50 p-4">
      <h2 className="text-sm font-bold text-gray-900">Pay GraceRun</h2>
      <p className="mt-1 text-2xl font-bold text-[#ED1C24]">${due}</p>
      <DeadlineBanner order={order} party="customer" />
      <p className="text-xs text-gray-600">
        Receipt total plus delivery. Please pay within 24 hours — no rush in the
        first couple of hours.
      </p>
      {remind && (
        <p className="mt-2 text-sm font-semibold text-amber-800">
          Friendly reminder: when you can, send payment to GraceRun so we can
          close this order.
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowDetails(true)}
        className="mt-3 w-full rounded-xl bg-[#ED1C24] py-3 text-sm font-bold text-white"
      >
        Pay Now
      </button>

      {showDetails && (
        <div className="mt-3 rounded-xl bg-white px-3 py-3 text-sm">
          <p className="font-semibold text-gray-900">
            {owner.method}
            {owner.id ? `: ${owner.id}` : ""}
          </p>
          {!owner.id && (
            <p className="mt-1 text-xs text-gray-500">
              PayMe/FPS details will be shared in chat if they are not listed here
              yet.
            </p>
          )}
          <p className="mt-2 text-xs text-gray-600">
            Send ${due} to GraceRun, then tap Mark as Paid.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={marking}
        onClick={onMarkPaid}
        className="mt-2 w-full rounded-xl border-2 border-[#ED1C24] py-3 text-sm font-bold text-[#ED1C24] disabled:opacity-60"
      >
        {marking ? "Saving…" : "Mark as Paid"}
      </button>
    </section>
  );
}

export function OrderProofPhotos({ order }: { order: Order }) {
  const shots = [
    { url: order.receiptUrl, label: "Fusion receipt" },
    { url: order.deliveryPhotoUrl, label: "Lobby photo" },
  ].filter((shot): shot is { url: string; label: string } => Boolean(shot.url));

  if (shots.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      {shots.map((shot) => (
        <div key={shot.label}>
          <p className="text-xs font-medium text-gray-500">{shot.label}</p>
          {shot.url.startsWith("mock://") ? (
            <p className="mt-1 text-xs text-gray-400">Uploaded ✓</p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shot.url}
              alt={shot.label}
              className="mt-2 max-h-48 w-full rounded-xl object-cover"
            />
          )}
        </div>
      ))}
    </div>
  );
}
