"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CustomItemCard } from "@/components/CustomItemCard";
import { ProductSearchPanel } from "@/components/ProductSearchPanel";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { useCart } from "@/context/CartContext";
import {
  ESTIMATED_DELIVERY_MINUTES,
  formatEta,
  getEstimatedDeliveryTime,
  isOverOrderLimit,
} from "@/lib/constants";
import { OrderLimitNotice } from "@/components/OrderLimitNotice";
import { lineTotal } from "@/lib/pricing";
import { formatMenuPrice } from "@/lib/types";
import { resolveOrderDeliveryFee } from "@/lib/order-delivery";
import { DeliveryFeeBreakdown } from "@/components/DeliveryFeeBreakdown";
import { getItemImage } from "@/data/aisle-images";
import { useUser } from "@/context/UserContext";
import { useCampus } from "@/context/CampusContext";
import { cartCampus, cartCampusError } from "@/lib/cart-campus";

export default function CartPage() {
  const router = useRouter();
  const { user } = useUser();
  const { items, subtotal, setQuantity, removeItem, clearCart } = useCart();
  const { campus: activeCampus } = useCampus();
  const campus = cartCampus(items) ?? activeCampus;
  const mixedError = cartCampusError(items, null);
  const fee = resolveOrderDeliveryFee(items, "", campus);
  const total = subtotal + fee.deliveryFee;
  const overLimit = isOverOrderLimit(subtotal);
  const eta = getEstimatedDeliveryTime();

  function handleCancelOrder() {
    clearCart();
    router.push("/");
  }

  return (
    <AppShell>
      <LakersWallpaper>
          <AppHeader showBack backHref="/" title="Your Cart" />

          <main className="mx-auto max-w-[480px] px-4 py-4 pb-44 md:pb-8">
            {items.length === 0 ? (
              <div>
                <div className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
                  <p className="text-4xl">🛒</p>
                  <p className="mt-3 text-sm text-gray-600">Your cart is empty.</p>
                  <Link
                    href="/"
                    className="mt-4 inline-block rounded-xl bg-fusion-red px-6 py-3 text-sm font-semibold text-white"
                  >
                    Start shopping
                  </Link>
                </div>
                <ProductSearchPanel
                  className="mt-4"
                  placeholder="Search to add an item…"
                />
                <CustomItemCard className="mt-4" />
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
                        <div className="flex min-w-0 gap-3">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                            {getItemImage(item) ? (
                              <Image
                                src={getItemImage(item)}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="56px"
                              />
                            ) : null}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatMenuPrice(item)} · ~{item.weightKg ?? 0.2} kg
                            </p>
                          {item.itemNote && (
                            <p className="mt-1 text-xs text-amber-700">
                              {item.itemNote}
                            </p>
                          )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-xs text-gray-400 underline"
                        >
                          Remove
                        </button>
                      </div>
                      <div
                        className="mt-3 flex items-center justify-between rounded-xl px-3 py-2"
                        style={{ backgroundColor: "#ffffff", border: "1px solid #fecaca" }}
                      >
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, quantity - 1)}
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-lg font-bold"
                          style={{ backgroundColor: "#f3f4f6", color: "#ED1C24" }}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span
                          className="min-w-8 text-center text-base font-extrabold tabular-nums"
                          style={{ color: "#111111" }}
                        >
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, quantity + 1)}
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-lg font-bold text-white"
                          style={{ backgroundColor: "#ED1C24" }}
                          aria-label="Increase quantity"
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
                      <span>Subtotal</span>
                      <span className={overLimit ? "font-bold text-[#ED1C24]" : undefined}>
                        ${subtotal}
                      </span>
                    </div>
                    <DeliveryFeeBreakdown breakdown={fee} />
                    <p className="text-xs text-gray-500">
                        Delivery fee is confirmed at checkout from your hall.
                      </p>
                    <div
                      className={`flex justify-between pt-2 text-base font-bold ${
                        overLimit ? "text-[#ED1C24]" : "text-gray-900"
                      }`}
                    >
                      <span>Total</span>
                      <span>${total}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-fusion-red">
                    Est. delivery ~{ESTIMATED_DELIVERY_MINUTES} min · by{" "}
                    {formatEta(eta)}
                  </p>
                </div>

                <ProductSearchPanel
                  className="mt-4"
                  placeholder="Search to add another item…"
                />

                <CustomItemCard className="mt-4" />

                <div className="mt-2">
                  <OrderLimitNotice subtotal={subtotal} />
                </div>
                {mixedError && (
                  <p className="mt-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {mixedError}
                  </p>
                )}
                <button
                  type="button"
                  disabled={overLimit || Boolean(mixedError)}
                  onClick={() => {
                    // Guests and signed-in users both finish on checkout so we
                    // can collect dorm / lobby in one place.
                    router.push("/checkout");
                  }}
                  className="mt-4 block w-full rounded-xl bg-fusion-red py-4 text-center text-base font-semibold text-white shadow-md disabled:opacity-60"
                >
                  {user ? "Continue to checkout" : "Checkout — no account needed"}
                </button>

                <button
                  type="button"
                  onClick={handleCancelOrder}
                  className="mt-3 w-full rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700"
                >
                  Cancel Order
                </button>
              </>
            )}
          </main>
        </LakersWallpaper>
    </AppShell>
  );
}
