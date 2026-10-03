"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { DeliveryAddressFields } from "@/components/DeliveryAddressFields";
import { PaymentMethodPicker } from "@/components/PaymentMethodPicker";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { LegalLink } from "@/components/LegalLink";
import { OrderLimitNotice } from "@/components/OrderLimitNotice";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { lineTotal } from "@/lib/pricing";
import { formatDeliveryAddress, getLobbyForHall } from "@/data/cuhk-locations";
import {
  ESTIMATED_DELIVERY_MINUTES,
  getEstimatedDeliveryTime,
  formatEta,
  PAYMENT_FLOW_STEPS,
  TIP_PRESETS,
  isOverOrderLimit,
  DEFAULT_SPECIAL_INSTRUCTIONS,
} from "@/lib/constants";
import {
  loadPaymentMethod,
  savePaymentMethod,
  type CustomerPaymentMethod,
} from "@/lib/payment-method";
import { usePlaceOrder } from "@/lib/use-place-order";
import { cartTotalWeightKg } from "@/lib/delivery";
import { validatePhone } from "@/lib/auth";
import {
  CANTEEN_DELIVERY_FEE,
  getRestaurant,
} from "@fusion-express/shared/canteen";
import { parseCanteenItemId } from "@fusion-express/shared/shop-kind";

export default function CanteenCheckoutPage() {
  const { user } = useUser();
  const { items, subtotal } = useCart();
  const { placeOrder, loading, error: placeError } = usePlaceOrder("canteen");

  const [college, setCollege] = useState(user?.college ?? "");
  const [hall, setHall] = useState(user?.hall ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [customerNote, setCustomerNote] = useState("");
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<CustomerPaymentMethod>("PayMe");

  useEffect(() => {
    setPaymentMethod(loadPaymentMethod());
  }, []);

  useEffect(() => {
    if (user?.college && !college) setCollege(user.college);
    if (user?.hall && !hall) setHall(user.hall);
    if (user?.phone && !phone) setPhone(user.phone);
  }, [user, college, hall, phone]);

  const canteenId = useMemo(() => {
    const ids = new Set(
      items
        .map((line) => parseCanteenItemId(line.item.id)?.restaurantId)
        .filter((id): id is string => Boolean(id)),
    );
    return ids.size === 1 ? [...ids][0] : undefined;
  }, [items]);
  const canteenName = canteenId ? getRestaurant(canteenId)?.name : undefined;

  const estimatedDeliveryAt = useMemo(() => getEstimatedDeliveryTime(), []);
  const tipAmount = customTip ? Number(customTip) || 0 : tip;
  const weightKg = useMemo(() => cartTotalWeightKg(items), [items]);
  const deliveryFee = CANTEEN_DELIVERY_FEE;
  const total = subtotal + deliveryFee + tipAmount;
  const overLimit = isOverOrderLimit(subtotal);
  const phoneOk = !validatePhone(phone);
  const singleCanteen = Boolean(canteenId);
  const canSubmit = Boolean(
    college && hall && phoneOk && !overLimit && singleCanteen,
  );
  const address =
    college && hall ? formatDeliveryAddress(college, hall) : null;
  const lobby = hall ? getLobbyForHall(hall) : "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    void placeOrder({
      college,
      hall,
      phone,
      paymentMethod,
      customerNote: customerNote.trim() || DEFAULT_SPECIAL_INSTRUCTIONS,
      tip: tipAmount,
    });
  }

  if (items.length === 0) {
    return (
      <AppShell>
        <LakersWallpaper>
          <AppHeader showBack backHref="/canteen" title="Canteen checkout" />
          <main className="mx-auto max-w-[480px] px-4 py-8 text-center">
            <p className="text-sm text-white/80">
              Your canteen cart is empty.
            </p>
            <Link href="/canteen" className="mt-4 inline-block text-emerald-400 underline">
              Browse canteens
            </Link>
            <p className="mt-6 text-xs text-white/50">
              Fusion grocery checkout is separate —{" "}
              <Link href="/fusion" className="underline">
                shop Fusion
              </Link>
              .
            </p>
          </main>
        </LakersWallpaper>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <LakersWallpaper>
        <AppHeader showBack backHref="/canteen/cart" title="Canteen checkout" />
        <main className="mx-auto max-w-[480px] px-4 py-4 pb-44 md:pb-8">
          <div className="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
            Canteen order
            {canteenName ? ` · ${canteenName}` : ""}. Fusion groceries use a
            different cart and checkout.
          </div>
          {placeError && (
            <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {placeError}
            </p>
          )}
          {!singleCanteen && (
            <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Only one canteen per order. Remove items from the extra canteen.
            </p>
          )}
          <div className="mb-4 rounded-xl bg-lakers-gold/20 px-4 py-3 text-sm font-medium text-lakers-gold">
            Est. delivery by {formatEta(estimatedDeliveryAt)} (~
            {ESTIMATED_DELIVERY_MINUTES} min) · flat HK${deliveryFee} delivery
          </div>

          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Order Summary</h2>
            <ul className="mt-3 space-y-2">
              {items.map(({ item, quantity }) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span>
                    {quantity}× {item.name}
                  </span>
                  <span>${lineTotal(item, quantity)}</span>
                </li>
              ))}
            </ul>
            {address && (
              <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-sm">
                <p className="font-medium">{address}</p>
                <p className="text-xs text-gray-500">Lobby: {lobby}</p>
              </div>
            )}
            <div className="mt-4 space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery (canteen flat)</span>
                <span>${deliveryFee}</span>
              </div>
              {tipAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tip</span>
                  <span>${tipAmount}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-base font-bold">
                <span>Total</span>
                <span>${total}</span>
              </div>
              <p className="text-xs text-gray-400">~{weightKg.toFixed(1)} kg</p>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold">Delivery details</h2>
              <div className="mt-3">
                <DeliveryAddressFields
                  college={college}
                  hall={hall}
                  onCollegeChange={setCollege}
                  onHallChange={setHall}
                />
              </div>
              <div className="mt-3">
                <label
                  htmlFor="canteen-phone"
                  className="block text-xs font-medium text-gray-600"
                >
                  Phone number
                </label>
                <input
                  id="canteen-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                />
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600">
                  Special instructions
                </label>
                <textarea
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder={DEFAULT_SPECIAL_INSTRUCTIONS}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold">Tip (optional)</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {TIP_PRESETS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setTip(amount);
                      setCustomTip("");
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      tip === amount && !customTip
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {amount === 0 ? "None" : `$${amount}`}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={0}
                value={customTip}
                onChange={(e) => {
                  setCustomTip(e.target.value);
                  setTip(0);
                }}
                placeholder="Custom tip ($)"
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
              />
            </section>

            <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <h2 className="text-sm font-bold text-emerald-900">Payment</h2>
              <p className="mt-1 text-sm text-emerald-900">
                Pay after delivery when the runner shares details.
              </p>
              <div className="mt-3 rounded-xl bg-white p-3">
                <PaymentMethodPicker
                  value={paymentMethod}
                  onChange={(method) => {
                    setPaymentMethod(method);
                    savePaymentMethod(method);
                  }}
                />
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-emerald-800">
                {PAYMENT_FLOW_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </section>

            <p className="text-sm text-white/80">
              Completing an order agrees to our{" "}
              <LegalLink href="/terms">Terms &amp; Conditions</LegalLink>.
            </p>

            <div className="fixed inset-x-0 bottom-16 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 md:static md:border-0 md:bg-transparent md:p-0">
              <div className="mx-auto max-w-[480px]">
                <OrderLimitNotice subtotal={subtotal} />
                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 text-base font-semibold text-white disabled:opacity-60"
                >
                  <span>
                    {loading
                      ? "Placing…"
                      : `Complete canteen order · ${paymentMethod}`}
                  </span>
                  <span className="text-sm font-normal">· ${total}</span>
                </button>
              </div>
            </div>
          </form>
        </main>
      </LakersWallpaper>
    </AppShell>
  );
}
