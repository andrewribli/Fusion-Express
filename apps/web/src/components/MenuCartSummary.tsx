"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomItemCard } from "@/components/CustomItemCard";
import { PaymentMethodPicker } from "@/components/PaymentMethodPicker";
import { PreviousOrderChecklist } from "@/components/PreviousOrderChecklist";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { calculateDeliveryFee, cartTotalWeightKg } from "@/lib/delivery";
import {
  loadPaymentMethod,
  savePaymentMethod,
  type CustomerPaymentMethod,
} from "@/lib/payment-method";
import { lineTotal } from "@/lib/pricing";
import { isOverOrderLimit } from "@/lib/constants";
import { OrderLimitNotice } from "@/components/OrderLimitNotice";

export function MenuCartSummary() {
  const router = useRouter();
  const { user } = useUser();
  const { items, itemCount, subtotal, setQuantity, removeItem } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<CustomerPaymentMethod>("PayMe");

  useEffect(() => {
    setPaymentMethod(loadPaymentMethod());
  }, []);

  const fee = calculateDeliveryFee({
    weightKg: cartTotalWeightKg(items),
    college: "",
  });
  const total = subtotal + fee.deliveryFee;
  const overLimit = isOverOrderLimit(subtotal);

  function choosePayment(method: CustomerPaymentMethod) {
    setPaymentMethod(method);
    savePaymentMethod(method);
  }

  function goCheckout() {
    if (itemCount === 0) return;
    // Guests finish on checkout (phone + dorm + lobby) — no login required.
    router.push("/checkout");
  }

  return (
    <aside className="space-y-3">
      <section
        className="shop-surface overflow-hidden rounded-2xl border border-gray-100 shadow-lg"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="flex items-center justify-between bg-[#ED1C24] px-4 py-3 text-white">
          <h2 className="text-sm font-bold">Your order</h2>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="space-y-3 p-4">
          {items.length === 0 ? (
            <p className="text-sm text-gray-500">Your cart is empty.</p>
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
          <PaymentMethodPicker value={paymentMethod} onChange={choosePayment} />

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
            <span>Total w/ delivery</span>
            <span>${total}</span>
          </div>
          <p className="text-[10px] leading-snug text-gray-500">
            Hall and delivery fee are confirmed at checkout.
          </p>
          <OrderLimitNotice subtotal={subtotal} />
          <button
            type="button"
            disabled={overLimit || itemCount === 0}
            onClick={goCheckout}
            className="block w-full rounded-xl bg-[#ED1C24] py-3 text-center text-sm font-bold text-white disabled:bg-gray-100 disabled:text-gray-400"
          >
            {user ? "Continue to checkout" : "Checkout — no account needed"}
          </button>
          <p className="text-[10px] leading-snug text-gray-500">
            Pay with {paymentMethod} after delivery. Completing an order agrees to
            our Terms.
          </p>
        </div>
      </section>

      <PreviousOrderChecklist />
      <CustomItemCard />
    </aside>
  );
}
