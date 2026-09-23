"use client";

import { useState } from "react";
import { AppHeader } from "@/ptero/components/AppHeader";
import { AppShell } from "@/ptero/components/AppShell";
import { PrototypeBanner } from "@/ptero/components/PrototypeBanner";
import { formInputClassName } from "@/ptero/components/DeliveryAddressFields";
import { CAMPUS } from "@/ptero/config/campus";
import { useAppState, useUser } from "@/ptero/context/AppState";
import { formatHkd } from "@/ptero/lib/types";

export default function RunnerDeliveriesPage() {
  const { user, canRunnerMode } = useUser();
  const { orders, markPurchased, markDelivered } = useAppState();
  const mine = orders.filter(
    (o) =>
      o.runnerId === user?.uid &&
      (o.status === "accepted" || o.status === "purchased"),
  );
  const [receipts, setReceipts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  if (!canRunnerMode) {
    return (
      <AppShell>
        <PrototypeBanner />
        <AppHeader title="Deliveries" />
        <main className="mx-auto max-w-[480px] px-4 py-8 text-sm text-gray-600">
          Switch to runner mode first.
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PrototypeBanner />
      <AppHeader title="Active deliveries" />
      <main className="mx-auto max-w-[480px] px-4 py-4 pb-28">
        {error && (
          <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        {mine.length === 0 ? (
          <p className="mt-8 text-center text-sm text-gray-500">No active runs.</p>
        ) : (
          <ul className="space-y-3">
            {mine.map((order) => (
              <li key={order.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-bold">{order.id}</p>
                <p className="text-xs text-gray-500">
                  {order.customerName} · {order.lobby}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Pay this at {CAMPUS.supermarket} yourself first. {CAMPUS.brandName} reimburses
                  after the customer pays via Airwallex.
                </p>
                <ul className="mt-2 text-sm">
                  {order.items.map((item) => (
                    <li key={item.itemId}>
                      {item.quantity}× {item.name}
                    </li>
                  ))}
                </ul>
                {order.status === "accepted" && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600">
                      Final {CAMPUS.supermarket} receipt total (HK$)
                      <input
                        inputMode="decimal"
                        value={receipts[order.id] ?? ""}
                        onChange={(e) =>
                          setReceipts((prev) => ({ ...prev, [order.id]: e.target.value }))
                        }
                        className={formInputClassName}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const value = Number(receipts[order.id]);
                        if (!value || value <= 0) {
                          setError("Enter the Taste receipt total.");
                          return;
                        }
                        setError("");
                        markPurchased(order.id, value);
                      }}
                      className="mt-2 w-full rounded-xl bg-[#111827] py-2.5 text-sm font-bold text-white"
                    >
                      Mark purchased at Taste
                    </button>
                  </div>
                )}
                {order.status === "purchased" && (
                  <button
                    type="button"
                    onClick={() => markDelivered(order.id)}
                    className="mt-3 w-full rounded-xl bg-fusion-red py-2.5 text-sm font-bold text-white"
                  >
                    Mark delivered to {order.lobby} · {formatHkd(order.receiptTotal ?? order.subtotal)}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
