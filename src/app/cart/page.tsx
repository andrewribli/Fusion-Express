"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { RequireAuth } from "@/components/RequireAuth";
import { useCart } from "@/context/CartContext";
import {
  ESTIMATED_DELIVERY_MINUTES,
  formatEta,
  getEstimatedDeliveryTime,
} from "@/lib/constants";
import { createCustomMenuItem } from "@/lib/custom-item";
import { lineTotal } from "@/lib/pricing";
import { DELIVERY_FEE, formatMenuPrice } from "@/lib/types";

export default function CartPage() {
  const router = useRouter();
  const { items, subtotal, setQuantity, removeItem, addItem, clearCart } =
    useCart();
  const [manualName, setManualName] = useState("");
  const total = subtotal + DELIVERY_FEE;
  const eta = getEstimatedDeliveryTime();

  function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = manualName.trim();
    if (!name) return;
    addItem(createCustomMenuItem(name));
    setManualName("");
  }

  function handleCancelOrder() {
    clearCart();
    router.push("/home");
  }

  return (
    <RequireAuth>
      <AppShell>
        <div className="min-h-screen bg-gray-50">
          <AppHeader showBack backHref="/menu" title="Your Cart" />

          <main className="mx-auto max-w-[480px] px-4 py-4">
            <PriceDisclaimer className="mb-4" />

            {items.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
                <p className="text-4xl">🛒</p>
                <p className="mt-3 text-sm text-gray-600">Your cart is empty.</p>
                <Link
                  href="/menu"
                  className="mt-4 inline-block rounded-xl bg-fusion-red px-6 py-3 text-sm font-semibold text-white"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <>
                <ul className="space-y-3">
                  {items.map(({ item, quantity }) => (
                    <li
                      key={item.id}
                      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatMenuPrice(item)} · per {item.unit} · est.
                          </p>
                          {item.itemNote && (
                            <p className="mt-1 text-xs text-amber-700">
                              {item.itemNote}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-xs text-gray-400 underline"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-red-50 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, quantity - 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-lg font-bold text-fusion-red"
                        >
                          −
                        </button>
                        <span className="font-semibold">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, quantity + 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg bg-fusion-red text-lg font-bold text-white"
                        >
                          +
                        </button>
                      </div>
                      <p className="mt-2 text-right text-sm font-medium text-gray-700">
                        ${lineTotal(item, quantity)}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Subtotal (est.)</span>
                      <span>${subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery fee</span>
                      <span>${DELIVERY_FEE}</span>
                    </div>
                    <div className="flex justify-between pt-2 text-base font-bold text-gray-900">
                      <span>Estimated total</span>
                      <span>${total}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-fusion-red">
                    Est. delivery ~{ESTIMATED_DELIVERY_MINUTES} min · by{" "}
                    {formatEta(eta)}
                  </p>
                </div>

                <Link
                  href="/checkout"
                  className="mt-4 block w-full rounded-xl bg-fusion-red py-4 text-center text-base font-semibold text-white shadow-md"
                >
                  Proceed to Checkout
                </Link>

                <button
                  type="button"
                  onClick={handleCancelOrder}
                  className="mt-3 w-full rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700"
                >
                  Cancel Order
                </button>
              </>
            )}

            <form
              onSubmit={handleManualAdd}
              className="mt-6 rounded-2xl border border-dashed border-orange-200 bg-white p-4 shadow-sm"
            >
              <label
                htmlFor="manual-item"
                className="block text-sm font-semibold text-gray-900"
              >
                Did we miss something? Add your item manually:
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="manual-item"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. 1 biggest Pocari Sweat"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-fusion-red focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!manualName.trim()}
                  className="rounded-xl bg-fusion-red px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Runner will use best judgment for substitutions and discounts.
              </p>
            </form>
          </main>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
