"use client";

import { useMemo, useState } from "react";
import type { Order } from "@/lib/types";
import { orderActualSubtotal, orderGrandTotal } from "@/lib/orders";

export function FusionPriceForm({
  order,
  onSubmit,
  loading,
}: {
  order: Order;
  onSubmit: (prices: Record<string, number>) => Promise<void>;
  loading?: boolean;
}) {
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      order.items.map((item) => [item.itemId, String(item.actualPrice ?? item.price)]),
    ),
  );
  const [error, setError] = useState("");

  const parsed = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of order.items) {
      const n = Number(prices[item.itemId]);
      if (Number.isNaN(n) || n < 0) return null;
      map[item.itemId] = n;
    }
    return map;
  }, [order.items, prices]);

  const previewItems = order.items.map((item) => ({
    ...item,
    actualPrice: parsed?.[item.itemId] ?? item.price,
  }));
  const actualSubtotal = orderActualSubtotal(previewItems);
  const diff = Math.round((actualSubtotal - order.subtotal) * 100) / 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!parsed) {
      setError("Enter a Fusion price for every item.");
      return;
    }
    try {
      await onSubmit(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save prices.");
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      <p className="text-xs font-semibold text-gray-700">
        Enter the shelf/receipt price at Fusion for each item (do not pay —
        GraceRun settles with Fusion)
      </p>
      <ul className="space-y-2">
        {order.items.map((item) => (
          <li key={item.itemId} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 flex-1 text-gray-700">
              {item.quantity}× {item.name}
              <span className="block text-[11px] text-gray-400">
                App estimate ${item.price}/ea
              </span>
            </span>
            <label className="flex shrink-0 items-center gap-1 text-xs text-gray-500">
              $
              <input
                type="number"
                min={0}
                step="0.1"
                required
                value={prices[item.itemId] ?? ""}
                onChange={(e) =>
                  setPrices((prev) => ({ ...prev, [item.itemId]: e.target.value }))
                }
                className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900"
              />
            </label>
          </li>
        ))}
      </ul>
      <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
        Fusion subtotal ${actualSubtotal} vs app estimate ${order.subtotal}
        {diff < 0 && (
          <span className="block font-medium text-green-700">
            Lower than the app. Customer pays ${actualSubtotal} for groceries
            (or is refunded the difference if they already paid).
          </span>
        )}
        {diff > 0 && (
          <span className="block font-medium text-amber-700">
            New total ${orderGrandTotal(actualSubtotal, order.deliveryFee, order.tip ?? 0)}.
            Customer must approve before you pick up.
          </span>
        )}
        {diff === 0 && <span className="block">Prices match the estimate.</span>}
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Saving…" : "Submit Fusion prices"}
      </button>
    </form>
  );
}
