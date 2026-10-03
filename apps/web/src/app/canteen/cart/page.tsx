"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { useCart } from "@/context/CartContext";
import { lineTotal } from "@/lib/pricing";
import { CANTEEN_DELIVERY_FEE } from "@fusion-express/shared/canteen";
import { isOverOrderLimit } from "@/lib/constants";
import { OrderLimitNotice } from "@/components/OrderLimitNotice";

export default function CanteenCartPage() {
  const router = useRouter();
  const { items, subtotal, setQuantity, removeItem, clearCart } = useCart();
  const total = subtotal + CANTEEN_DELIVERY_FEE;
  const overLimit = isOverOrderLimit(subtotal);

  return (
    <AppShell>
      <LakersWallpaper>
        <AppHeader showBack backHref="/canteen" title="Canteen cart" />
        <main className="mx-auto max-w-[480px] px-4 py-4 pb-28">
          <p className="mb-3 rounded-xl border border-emerald-400/30 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-100">
            This cart is for campus canteens only. Fusion groceries stay in a
            separate cart.
          </p>
          {items.length === 0 ? (
            <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
              <p className="text-sm text-gray-600">Canteen cart is empty.</p>
              <Link
                href="/canteen"
                className="mt-4 inline-block rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white"
              >
                Browse canteens
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
                        {item.itemNote ? (
                          <p className="mt-1 text-xs text-amber-700">
                            {item.itemNote}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-gray-400 underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, quantity - 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold text-emerald-700"
                        >
                          −
                        </button>
                        <span className="min-w-8 text-center font-bold">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, quantity + 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-lg font-bold text-white"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-sm font-medium">
                        ${lineTotal(item, quantity)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal}</span>
                </div>
                <div className="mt-1 flex justify-between text-gray-600">
                  <span>Delivery (flat)</span>
                  <span>${CANTEEN_DELIVERY_FEE}</span>
                </div>
                <div className="mt-2 flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>${total}</span>
                </div>
              </div>
              <OrderLimitNotice subtotal={subtotal} />
              <button
                type="button"
                disabled={overLimit}
                onClick={() => router.push("/canteen/checkout")}
                className="mt-4 block w-full rounded-xl bg-emerald-500 py-4 text-center text-base font-semibold text-white disabled:opacity-60"
              >
                Continue to canteen checkout
              </button>
              <button
                type="button"
                onClick={() => {
                  clearCart();
                  router.push("/canteen");
                }}
                className="mt-3 w-full rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700"
              >
                Clear canteen cart
              </button>
            </>
          )}
        </main>
      </LakersWallpaper>
    </AppShell>
  );
}
