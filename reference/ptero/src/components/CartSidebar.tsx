"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { canteenDeliveryFeeHkd, isCanteenCart } from "@/lib/canteen/cart";
import { calculateDeliveryFee, cartTotalWeightKg } from "@/lib/delivery";
import { lineTotal } from "@/lib/pricing";
import { isOverOrderLimit } from "@/lib/constants";
import { formatHkd } from "@/lib/types";

export function CartSidebar({
  flatDeliveryFee = false,
}: {
  /** Force HK$10 canteen fee (canteen shop chrome). */
  flatDeliveryFee?: boolean;
}) {
  const router = useRouter();
  const { items, itemCount, subtotal, setQuantity, removeItem } = useCart();
  const canteen = flatDeliveryFee || isCanteenCart(items);
  const fee = canteen
    ? {
        deliveryFee: canteenDeliveryFeeHkd(),
      }
    : calculateDeliveryFee({
        weightKg: cartTotalWeightKg(items),
        compound: "",
      });
  const total = subtotal + fee.deliveryFee;
  const overLimit = isOverOrderLimit(subtotal);

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-bold text-gray-900">Your cart</h2>
        <p className="text-xs text-gray-500">
          {itemCount} item{itemCount === 1 ? "" : "s"}
          {canteen ? " · Canteen" : ""}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            Start adding items to your cart.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map(({ item, quantity }) => (
              <li key={item.id} className="flex gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium text-gray-900">{item.name}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.id, quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-sm font-bold"
                    >
                      −
                    </button>
                    <span className="min-w-5 text-center text-xs font-semibold">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(item.id, quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-sm font-bold"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="ml-1 text-[11px] text-gray-400 hover:text-[#ED1C24]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <span className="shrink-0 font-semibold text-gray-900">
                  {formatHkd(lineTotal(item, quantity))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 border-t border-gray-100 px-4 py-3">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span className={overLimit ? "font-bold text-[#ED1C24]" : undefined}>
            {formatHkd(subtotal)}
          </span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Delivery</span>
          <span>{formatHkd(fee.deliveryFee)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold text-gray-900">
          <span>Total (incl. fees)</span>
          <span>{formatHkd(total)}</span>
        </div>
        <p className="text-[10px] leading-snug text-gray-500">
          {canteen
            ? "Flat HK$10 canteen delivery. 10% residence discount applies when your runner matches."
            : "Delivery fee confirmed at checkout from your CityU hall."}
        </p>
        <button
          type="button"
          disabled={overLimit || itemCount === 0}
          onClick={() => router.push("/checkout")}
          className="w-full rounded-xl bg-[#ED1C24] py-3 text-sm font-bold text-white disabled:bg-gray-100 disabled:text-gray-400"
        >
          Go to checkout
        </button>
        <Link
          href="/cart"
          className="block text-center text-xs font-semibold text-[#ED1C24]"
        >
          View full cart
        </Link>
      </div>
    </aside>
  );
}
