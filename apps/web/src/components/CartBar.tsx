"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { resolveOrderDeliveryFee } from "@/lib/order-delivery";

export function CartBar() {
  const { itemCount, subtotal, items } = useCart();

  if (itemCount === 0) return null;

  const fee = resolveOrderDeliveryFee(items, "");
  const total = subtotal + fee.deliveryFee;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-100 bg-white/95 p-4 backdrop-blur">
      <div className="mx-auto flex max-w-[480px] items-center justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500">
            {itemCount} item{itemCount !== 1 ? "s" : ""} · ${fee.deliveryFee} delivery
          </p>
          <p className="text-lg font-bold text-gray-900">${total}</p>
        </div>
        <Link
          href="/checkout"
          className="rounded-xl bg-[#ED1C24] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#c9171e]"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
