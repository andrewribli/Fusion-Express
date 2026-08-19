"use client";

import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useCart } from "@/context/CartContext";
import { DELIVERY_FEE, formatMenuPrice } from "@/lib/types";

export default function CartPage() {
  const { items, subtotal, setQuantity, removeItem } = useCart();
  const total = subtotal + DELIVERY_FEE;

  return (
    <RequireAuth>
      <AppShell>
        <div className="min-h-screen bg-gray-50">
        <AppHeader showBack backHref="/home" title="Your Cart" />

        <main className="mx-auto max-w-[480px] px-4 py-4">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
              <p className="text-4xl">🛒</p>
              <p className="mt-3 text-sm text-gray-600">Your cart is empty.</p>
              <Link
                href="/home"
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
                          {formatMenuPrice(item)} · per {item.unit}
                        </p>
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
                      ${item.price * quantity}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery fee</span>
                    <span>${DELIVERY_FEE}</span>
                  </div>
                  <div className="flex justify-between pt-2 text-base font-bold text-gray-900">
                    <span>Total</span>
                    <span>${total}</span>
                  </div>
                </div>
              </div>

              <Link
                href="/checkout"
                className="mt-4 block w-full rounded-xl bg-fusion-red py-4 text-center text-base font-semibold text-white shadow-md"
              >
                Proceed to Checkout
              </Link>
            </>
          )}
        </main>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
