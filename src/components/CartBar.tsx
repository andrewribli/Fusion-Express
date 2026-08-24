"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { DELIVERY_FEE } from "@/lib/types";

export function CartBar() {
  const { itemCount, subtotal } = useCart();

  if (itemCount === 0) return null;

  const total = subtotal + DELIVERY_FEE;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-100 bg-white/95 p-4 backdrop-blur">
      <div className="mx-auto flex max-w-[480px] items-center justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500">
            {itemCount} item{itemCount !== 1 ? "s" : ""} · +${DELIVERY_FEE} delivery
          </p>
          <p className="text-lg font-bold text-gray-900">${total}</p>
        </div>
        <Link
          href="/checkout"
          className="rounded-xl bg-fusion-red px-6 py-3 text-sm font-semibold text-lakers-navy transition-colors hover:bg-white"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
