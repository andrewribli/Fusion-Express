"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { calculateDeliveryFee, cartTotalWeightKg } from "@/lib/delivery";

export function OrderActionBar() {
  const { itemCount, subtotal, items } = useCart();
  const { user } = useUser();
  const fee = calculateDeliveryFee({
    weightKg: cartTotalWeightKg(items),
    college: user?.college ?? "",
  });

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur md:bottom-0">
      <div className="mx-auto flex max-w-7xl gap-3">
        <Link
          href="/cart"
          className="flex-1 rounded-xl border-2 border-gray-300 py-3 text-center text-sm font-semibold text-gray-800"
        >
          Go back to your order
          {itemCount > 0 ? ` (${itemCount})` : ""}
        </Link>
        <Link
          href={itemCount > 0 ? "/checkout" : "/cart"}
          className="flex-1 rounded-xl bg-fusion-red py-3 text-center text-sm font-semibold text-white"
        >
          Complete your order
          {itemCount > 0 ? ` · $${subtotal + fee.deliveryFee}` : ""}
        </Link>
      </div>
    </div>
  );
}
