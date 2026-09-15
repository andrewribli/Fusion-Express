"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomItemCard } from "@/components/CustomItemCard";
import { DeliveryAddressFields } from "@/components/DeliveryAddressFields";
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
import { usePlaceOrder } from "@/lib/use-place-order";
import { OrderLimitNotice } from "@/components/OrderLimitNotice";

export function MenuCartSummary() {
  const router = useRouter();
  const { user } = useUser();
  const { items, itemCount, subtotal, setQuantity, removeItem } = useCart();
  const { placeOrder, loading, error } = usePlaceOrder();
  const [college, setCollege] = useState(user?.college ?? "");
  const [hall, setHall] = useState(user?.hall ?? "");
  const [paymentMethod, setPaymentMethod] = useState<CustomerPaymentMethod>("PayMe");

  useEffect(() => {
    setPaymentMethod(loadPaymentMethod());
  }, []);

  useEffect(() => {
    if (user?.college) setCollege(user.college);
    if (user?.hall) setHall(user.hall);
  }, [user?.college, user?.hall]);

  const fee = calculateDeliveryFee({
    weightKg: cartTotalWeightKg(items),
    college: college || user?.college || "",
  });
  const total = subtotal + fee.deliveryFee;
  const needsAddress = !college || !hall;
  const overLimit = isOverOrderLimit(subtotal);

  function choosePayment(method: CustomerPaymentMethod) {
    setPaymentMethod(method);
    savePaymentMethod(method);
  }

  async function completeOrder() {
    if (itemCount === 0) return;
    if (!user) {
      router.push("/login?next=/");
      return;
    }
    if (needsAddress) return;
    await placeOrder({ college, hall, paymentMethod });
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
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>

        {items.length === 0 ? (
          <p className="shop-muted px-4 py-8 text-center text-xs" style={{ color: "#6b7280" }}>
            Click any item to add it here.
          </p>
        ) : (
          <ul className="max-h-[36vh] divide-y divide-gray-100 overflow-y-auto">
            {items.map(({ item, quantity }) => (
              <li key={item.id} className="px-3 py-3">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked
                    onChange={() => removeItem(item.id)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#ED1C24]"
                    aria-label={`Remove ${item.name} from cart`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-xs font-semibold text-gray-900">
                        {item.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-[10px] text-gray-400 hover:text-[#ED1C24]"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-lg bg-gray-100 px-0.5">
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center text-sm font-bold text-[#ED1C24]"
                          aria-label={`Remove one ${item.name}`}
                        >
                          −
                        </button>
                        <span
                          className="min-w-7 px-1 text-center text-sm font-bold tabular-nums text-[#111827]"
                          aria-live="polite"
                          aria-atomic="true"
                        >
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center text-sm font-bold text-[#ED1C24]"
                          aria-label={`Add one ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs font-bold text-gray-900">
                        ${lineTotal(item, quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 border-t border-gray-100 p-3">
          {user && needsAddress ? (
            <DeliveryAddressFields
              college={college}
              hall={hall}
              onCollegeChange={setCollege}
              onHallChange={setHall}
              showPricing={false}
            />
          ) : null}

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
          <OrderLimitNotice subtotal={subtotal} />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button
            type="button"
            disabled={
              overLimit || itemCount === 0 || loading || (Boolean(user) && needsAddress)
            }
            onClick={() => void completeOrder()}
            className="block w-full rounded-xl bg-[#ED1C24] py-3 text-center text-sm font-bold text-white disabled:bg-gray-100 disabled:text-gray-400"
          >
            {loading
              ? "Placing…"
              : !user
                ? "Sign in to complete order"
                : needsAddress
                  ? "Choose hall to complete"
                  : `Complete Order · ${paymentMethod}`}
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
