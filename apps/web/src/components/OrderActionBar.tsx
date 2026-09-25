"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { resolveOrderDeliveryFee } from "@/lib/order-delivery";
import { isOverOrderLimit } from "@/lib/constants";
import { OrderLimitNotice } from "@/components/OrderLimitNotice";
import { getCanteenCheckoutGate, isCanteenCart } from "@/lib/canteen/cart";

export function OrderActionBar({
  orderingEnabled = true,
}: {
  orderingEnabled?: boolean;
}) {
  const router = useRouter();
  const { itemCount, subtotal, items } = useCart();
  const fee = resolveOrderDeliveryFee(items, "");
  const overLimit = isOverOrderLimit(subtotal);
  const canteenGate = getCanteenCheckoutGate(items);
  const canteenBlocked = isCanteenCart(items) && !canteenGate.allowed;
  const checkoutEnabled = orderingEnabled && !canteenBlocked;

  if (itemCount === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[4.25rem] z-40 px-3 md:bottom-4 xl:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-lg flex-col gap-1.5">
        <OrderLimitNotice subtotal={subtotal} />
        <button
          type="button"
          disabled={overLimit || !checkoutEnabled}
          onClick={() => {
            if (!checkoutEnabled) return;
            router.push("/checkout");
          }}
          className="flex min-h-11 w-full items-center justify-center rounded-full px-4 text-sm font-bold text-white shadow-lg disabled:opacity-50"
          style={{ backgroundColor: checkoutEnabled ? "#ED1C24" : "#9ca3af" }}
        >
          {checkoutEnabled
            ? `Continue to checkout · $${subtotal + fee.deliveryFee}`
            : "Checkout unavailable — see cart"}
        </button>
      </div>
    </div>
  );
}
