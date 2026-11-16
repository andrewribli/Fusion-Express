"use client";

import { useRouter } from "next/navigation";
import { CustomItemCard } from "@/components/CustomItemCard";
import { PreviousOrderChecklist } from "@/components/PreviousOrderChecklist";
import { useCart } from "@/context/CartContext";
import { resolveOrderDeliveryFee } from "@/lib/order-delivery";
import { lineTotal } from "@/lib/pricing";
import { isOverOrderLimit } from "@/lib/constants";
import { OrderLimitNotice } from "@/components/OrderLimitNotice";

export function MenuCartSummary({
  channel = "fusion",
  orderingEnabled = true,
}: {
  channel?: "fusion" | "canteen";
  orderingEnabled?: boolean;
}) {
  const router = useRouter();
  const { items, itemCount, subtotal, setQuantity, removeItem } = useCart();

  const fee = resolveOrderDeliveryFee(items, "");
  const total = subtotal + fee.deliveryFee;
  const overLimit = isOverOrderLimit(subtotal);
  const checkoutBlocked = !orderingEnabled || overLimit || itemCount === 0;

  function goCheckout() {
    if (checkoutBlocked) return;
    router.push("/checkout");
  }

  return (
    <aside className="space-y-3">
      <section
        className="shop-surface overflow-hidden rounded-2xl border border-gray-100 shadow-lg"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-bold text-gray-900">Your cart</h2>
          <p className="text-xs text-gray-500">
            {itemCount} item{itemCount === 1 ? "" : "s"}
            {channel === "canteen" ? " · Canteen" : ""}
          </p>
        </div>

        <div className="space-y-3 p-4">
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              Start adding items to your cart.
            </p>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {items.map(({ item, quantity }) => (
                <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{item.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity(item.id, quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold"
                      >
                        −
                      </button>
                      <span className="text-xs font-semibold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(item.id, quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold">${lineTotal(item, quantity)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t border-gray-100 p-3">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Subtotal</span>
            <span className={overLimit ? "font-bold text-[#ED1C24]" : undefined}>
              ${subtotal}
            </span>
          </div>
          <div
            className={`flex justify-between text-sm font-bold ${
              overLimit ? "text-[#ED1C24]" : "text-gray-900"
            }`}
          >
            <span>Total (incl. fees)</span>
            <span>${total}</span>
          </div>
          <p className="text-[10px] leading-snug text-gray-500">
            Hall and delivery fee are confirmed at checkout.
          </p>
          <OrderLimitNotice subtotal={subtotal} />
          {!orderingEnabled ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
              This canteen is closed — checkout is paused until it opens.
            </p>
          ) : null}
          <button
            type="button"
            disabled={checkoutBlocked}
            onClick={goCheckout}
            className="block w-full rounded-xl bg-[#ED1C24] py-3 text-center text-sm font-bold text-white disabled:bg-gray-100 disabled:text-gray-400"
          >
            Go to checkout
          </button>
          <p className="text-[10px] leading-snug text-gray-500">
            Pay after delivery. Completing an order agrees to our Terms.
          </p>
        </div>
      </section>

      <PreviousOrderChecklist channel={channel} />
      {channel === "fusion" ? <CustomItemCard /> : null}
    </aside>
  );
}
