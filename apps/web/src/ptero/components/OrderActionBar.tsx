"use client";

import { useRouter } from "next/navigation";
import { OrderLimitNotice } from "@/ptero/components/OrderLimitNotice";
import { useCart } from "@/ptero/context/CartContext";
import { canteenDeliveryFeeHkd, isCanteenCart } from "@/ptero/lib/canteen/cart";
import { isOverOrderLimit } from "@/ptero/lib/constants";
import { calculateDeliveryFee, cartTotalWeightKg } from "@/ptero/lib/delivery";

/** Mobile sticky checkout bar — mirrors gracerun.fit OrderActionBar. */
export function OrderActionBar() {
  const router = useRouter();
  const { itemCount, subtotal, items } = useCart();
  const canteen = isCanteenCart(items);
  const fee = canteen
    ? canteenDeliveryFeeHkd()
    : calculateDeliveryFee({
        weightKg: cartTotalWeightKg(items),
        compound: "",
      }).deliveryFee;
  const overLimit = isOverOrderLimit(subtotal);

  if (itemCount === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[4.25rem] z-40 px-3 md:bottom-4 xl:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-lg flex-col gap-1.5">
        <OrderLimitNotice subtotal={subtotal} />
        <button
          type="button"
          disabled={overLimit}
          onClick={() => router.push("/cityu/checkout")}
          className="flex min-h-11 w-full items-center justify-center rounded-full bg-[#ED1C24] px-4 text-sm font-bold text-white shadow-lg disabled:opacity-50"
        >
          {`Continue to checkout · $${(subtotal + fee).toFixed(0)}`}
        </button>
      </div>
    </div>
  );
}
