"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/ptero/components/AppHeader";
import { AppShell } from "@/ptero/components/AppShell";
import { PrototypeBanner } from "@/ptero/components/PrototypeBanner";
import { useCart } from "@/ptero/context/CartContext";
import {
  ESTIMATED_DELIVERY_MINUTES,
  formatEta,
  getEstimatedDeliveryTime,
  isOverOrderLimit,
  ORDER_LIMIT_MESSAGE,
} from "@/ptero/lib/constants";
import { lineTotal } from "@/ptero/lib/pricing";
import { formatMenuPrice } from "@/ptero/lib/types";
import { calculateDeliveryFee, cartTotalWeightKg } from "@/ptero/lib/delivery";

export default function CartPage() {
  const router = useRouter();
  const { items, subtotal, setQuantity, removeItem, clearCart } = useCart();
  const weightKg = cartTotalWeightKg(items);
  const fee = calculateDeliveryFee({ weightKg, compound: "" });
  const overLimit = isOverOrderLimit(subtotal);
  const eta = getEstimatedDeliveryTime();

  return (
    <AppShell>
      <PrototypeBanner />
      <AppHeader showBack backHref="/cityu" title="Your Cart" />
      <main className="mx-auto max-w-[480px] px-4 py-4 pb-44 md:pb-8">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-4xl">🛒</p>
            <p className="mt-3 text-sm text-gray-600">Your cart is empty.</p>
            <Link
              href="/cityu"
              className="mt-4 inline-block rounded-xl bg-fusion-red px-6 py-3 text-sm font-semibold text-white"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            {overLimit && (
              <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {ORDER_LIMIT_MESSAGE}
              </p>
            )}
            <ul className="space-y-3">
              {items.map(({ item, quantity }) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex justify-between gap-2">
                    <div className="flex min-w-0 gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt=""
                            fill
                            className="object-contain p-1"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-gray-500">{formatMenuPrice(item)}</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-[#ED1C24]">
                      ${lineTotal(item, quantity).toFixed(2)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity(item.id, quantity - 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg font-bold"
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center text-sm font-bold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(item.id, quantity + 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ED1C24] text-lg font-bold text-white"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-xs font-semibold text-gray-500 underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 text-sm shadow-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>HK${subtotal.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex justify-between text-gray-500">
                <span>Delivery (from HK${fee.baseFee})</span>
                <span>Finalised at checkout</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Est. delivery by {formatEta(eta)} (~{ESTIMATED_DELIVERY_MINUTES} min)
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  clearCart();
                  router.push("/cityu");
                }}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold"
              >
                Clear
              </button>
              <Link
                href={overLimit ? "#" : "/cityu/checkout"}
                className={`flex flex-[2] items-center justify-center rounded-xl py-3 text-sm font-semibold text-white ${
                  overLimit ? "pointer-events-none bg-gray-300" : "bg-fusion-red"
                }`}
              >
                Checkout
              </Link>
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
