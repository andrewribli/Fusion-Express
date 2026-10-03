"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/ptero/context/CartContext";
import {
  isCanteenCart,
  primaryCanteenRestaurantId,
} from "@/ptero/lib/canteen/cart";
import { lineTotal } from "@/ptero/lib/pricing";
import { isOverOrderLimit } from "@/ptero/lib/constants";
import { formatHkd } from "@/ptero/lib/types";
import { isGrocerySourceId } from "@/lib/grocerySources";
import { computeDeliveryFee } from "@fusion-express/shared/delivery-pricing";
import { DeliveryQuote } from "@/components/DeliveryQuote";
import { readCityuHall } from "@/lib/cityu-hall";

export function CartSidebar({
  flatDeliveryFee = false,
  hallId,
}: {
  /** Canteen shop chrome. The fee still comes from the pricing engine. */
  flatDeliveryFee?: boolean;
  hallId?: string;
}) {
  const router = useRouter();
  const { items, itemCount, subtotal, setQuantity, removeItem } = useCart();
  const canteen = flatDeliveryFee || isCanteenCart(items);
  const [savedHall, setSavedHall] = useState("");
  useEffect(() => {
    setSavedHall(readCityuHall());
  }, []);
  const hall = hallId || savedHall;
  const groceryIds = [
    ...new Set(
      items.map((line) => line.item.grocerySource).filter(isGrocerySourceId),
    ),
  ];
  const sourceId = canteen
    ? primaryCanteenRestaurantId(items.map((line) => ({ id: line.item.id }))) || "ac1"
    : groceryIds[0] || "taste";
  const quote = computeDeliveryFee({
    campus: "cityu",
    sourceId,
    hallId: hall,
  });
  const total = subtotal + quote.total;
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
        <DeliveryQuote quote={quote} />
        <div className="flex justify-between text-sm font-bold text-gray-900">
          <span>Total (incl. fees)</span>
          <span>{formatHkd(total)}</span>
        </div>
        <p className="text-[10px] leading-snug text-gray-500">
          {hall
            ? "10% residence discount applies to food when your runner matches. Delivery stays at the total above."
            : "Hall surcharge is added once you choose a hall."}
        </p>
        <button
          type="button"
          disabled={overLimit || itemCount === 0}
          onClick={() => router.push("/cityu/checkout")}
          className="w-full rounded-xl bg-[#ED1C24] py-3 text-sm font-bold text-white disabled:bg-gray-100 disabled:text-gray-400"
        >
          Go to checkout
        </button>
        <Link
          href="/cityu/cart"
          className="block text-center text-xs font-semibold text-[#ED1C24]"
        >
          View full cart
        </Link>
      </div>
    </aside>
  );
}
