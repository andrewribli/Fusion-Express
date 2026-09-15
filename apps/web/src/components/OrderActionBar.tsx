"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { calculateDeliveryFee, cartTotalWeightKg } from "@/lib/delivery";
import { loadPaymentMethod } from "@/lib/payment-method";
import { isOverOrderLimit } from "@/lib/constants";
import { usePlaceOrder } from "@/lib/use-place-order";
import { OrderLimitNotice } from "@/components/OrderLimitNotice";

export function OrderActionBar() {
  const router = useRouter();
  const { itemCount, subtotal, items } = useCart();
  const { user } = useUser();
  const { placeOrder, loading } = usePlaceOrder();
  const [paymentMethod, setPaymentMethod] = useState(loadPaymentMethod());
  const fee = calculateDeliveryFee({
    weightKg: cartTotalWeightKg(items),
    college: user?.college ?? "",
  });
  const overLimit = isOverOrderLimit(subtotal);

  useEffect(() => {
    setPaymentMethod(loadPaymentMethod());
  }, [itemCount]);

  async function completeOrder() {
    if (itemCount === 0) return;
    if (!user) {
      router.push("/login?next=/");
      return;
    }
    if (!user.college || !user.hall) {
      router.push("/checkout");
      return;
    }
    await placeOrder({
      college: user.college,
      hall: user.hall,
      paymentMethod,
    });
  }

  if (itemCount === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[4.25rem] z-40 px-3 md:bottom-4 xl:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-lg flex-col gap-1.5">
        <OrderLimitNotice subtotal={subtotal} />
        <button
          type="button"
          disabled={overLimit || loading}
          onClick={() => void completeOrder()}
          className="flex min-h-11 w-full items-center justify-center rounded-full px-4 text-sm font-bold text-white shadow-lg disabled:opacity-50"
          style={{ backgroundColor: "#ED1C24" }}
        >
          {loading
            ? "Placing…"
            : `Complete · $${subtotal + fee.deliveryFee} · ${paymentMethod}`}
        </button>
      </div>
    </div>
  );
}
