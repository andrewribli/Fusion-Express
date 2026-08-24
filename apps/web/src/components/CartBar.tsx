"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { calculateDeliveryFee, cartTotalWeightKg } from "@/lib/delivery";

export function CartBar() {
  const { itemCount, subtotal, items } = useCart();
  const { user } = useUser();

  if (itemCount === 0) return null;

  const fee = calculateDeliveryFee({
    weightKg: cartTotalWeightKg(items),
    college: user?.college ?? "",
  });
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
          className="rounded-xl bg-fusion-red px-6 py-3 text-sm font-semibold text-lakers-navy transition-colors hover:bg-white"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
