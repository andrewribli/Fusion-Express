"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { CustomItemCard } from "@/components/CustomItemCard";
import { DeliveryAddressFields } from "@/components/DeliveryAddressFields";
import { PaymentMethodPicker } from "@/components/PaymentMethodPicker";
import { ProductSearchPanel } from "@/components/ProductSearchPanel";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { LegalLink } from "@/components/LegalLink";
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
import { OrderLimitNotice } from "@/components/OrderLimitNotice";
import {
  loadPaymentMethod,
  savePaymentMethod,
  type CustomerPaymentMethod,
} from "@/lib/payment-method";
import { usePlaceOrder } from "@/lib/use-place-order";
import { calculateDeliveryFee, cartTotalWeightKg } from "@/lib/delivery";
import { DeliveryFeeBreakdown } from "@/components/DeliveryFeeBreakdown";
import { validatePhone } from "@/lib/auth";

export default function CheckoutPage() {
  const { user } = useUser();
  const { items, subtotal } = useCart();
  const { placeOrder, loading, error: placeError } = usePlaceOrder();

  const [college, setCollege] = useState("");
  const [hall, setHall] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [customerNote, setCustomerNote] = useState("");
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<CustomerPaymentMethod>("PayMe");

  useEffect(() => {
    setPaymentMethod(loadPaymentMethod());
  }, []);

  useEffect(() => {
    if (user?.phone && !phone) setPhone(user.phone);
  }, [user, phone]);

  const estimatedDeliveryAt = useMemo(() => getEstimatedDeliveryTime(), []);
  const tipAmount = Math.max(0, customTip ? Number(customTip) || 0 : tip);
  const weightKg = useMemo(() => cartTotalWeightKg(items), [items]);
  const fee = useMemo(
    () => calculateDeliveryFee({ weightKg, college }),
    [weightKg, college],
  );
  const total = subtotal + fee.deliveryFee + tipAmount;
  const overLimit = isOverOrderLimit(subtotal);
  const phoneOk = !validatePhone(phone);
  const canSubmit = Boolean(college && hall && phoneOk && !overLimit);
  const address =
    college && hall
      ? formatDeliveryAddress(college, hall)
      : null;
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
          <AppHeader showBack backHref="/cart" title="Checkout" />
          <main className="mx-auto max-w-[480px] px-4 py-8">
            <p className="text-center text-sm text-white/80">
              Nothing to checkout yet. Search below, add a custom item, or keep
              shopping.
            </p>
            <ProductSearchPanel
              className="mt-4"
              placeholder="Search to add an item…"
            />
            <CustomItemCard className="mt-4" />
            <p className="mt-4 text-center">
              <Link href="/" className="text-lakers-gold underline">
                Go shopping
              </Link>
            </p>
          </main>
        </LakersWallpaper>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <LakersWallpaper>
        <AppHeader showBack backHref="/cart" title="Checkout" />

        <main className="mx-auto max-w-[480px] px-4 py-4 pb-44 md:pb-8">
          {!user && (
            <div className="mb-4 rounded-xl border border-lakers-gold/40 bg-lakers-navy/80 px-4 py-3 text-sm text-lakers-gold">
              No account needed. Enter your dorm, lobby, and phone — we&apos;ll
              create your account when you order.{" "}
              <Link href="/login?next=/checkout" className="underline">
                Already have an account? Sign in
              </Link>
            </div>
          )}
          {placeError && (
            <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {placeError}
            </p>
          )}
          <div className="mb-4 rounded-xl bg-lakers-gold/20 px-4 py-3 text-sm font-medium text-lakers-gold">
            Est. delivery by {formatEta(estimatedDeliveryAt)} (~
            {ESTIMATED_DELIVERY_MINUTES} min after order)
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
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{address}</p>
                    <p className="text-xs text-gray-500">Lobby: {lobby}</p>
                    {phoneOk && (
                      <p className="text-xs text-gray-500">Phone: {phone}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById("delivery-address-editor")
                        ?.scrollIntoView({ behavior: "smooth", block: "center" })
                    }
                    className="shrink-0 text-xs font-bold text-[#ED1C24] hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
            <div className="mt-4 space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className={overLimit ? "font-bold text-[#ED1C24]" : undefined}>
                  ${subtotal}
                </span>
              </div>
              <DeliveryFeeBreakdown breakdown={fee} />
              {tipAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tip</span>
                  <span>${tipAmount}</span>
                </div>
              )}
              <div
                className={`flex justify-between pt-1 text-base font-bold ${
                  overLimit ? "text-[#ED1C24]" : ""
                }`}
              >
                <span>Total</span>
                <span>${total}</span>
              </div>
            </div>
          </section>

          <ProductSearchPanel
            className="mt-4"
            placeholder="Search to add an item…"
          />

          <CustomItemCard className="mt-4" />

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <section
              id="delivery-address-editor"
              className="scroll-mt-28 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <h2 className="text-sm font-semibold">Delivery details</h2>
              <p className="mt-1 text-xs text-gray-500">
                Only three things we need: dorm (college + hall), lobby, and phone.
              </p>
              <div className="mt-3">
                <DeliveryAddressFields
                  college={college}
                  hall={hall}
                  onCollegeChange={setCollege}
                  onHallChange={setHall}
                />
              </div>
              {hall ? (
                <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Lobby
                  </span>
                  <p className="mt-0.5 font-semibold">{lobby}</p>
                  <p className="text-xs text-gray-500">
                    Delivery is to your hall lobby — no room number needed.
                  </p>
                </div>
              ) : null}
              <div className="mt-3">
                <label
                  htmlFor="guest-phone"
                  className="block text-xs font-medium text-gray-600"
                >
                  Phone number
                </label>
                <input
                  id="guest-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9123 4567"
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Used to create your account and for the runner to reach you.
                </p>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium uppercase tracking-wide text-gray-600">
                  Special instructions
                </label>
                <textarea
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder={DEFAULT_SPECIAL_INSTRUCTIONS}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold">Add a tip (optional)</h2>
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
                        ? "bg-fusion-red text-white"
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

            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <h2 className="text-sm font-bold text-blue-900">How payment works</h2>
              <p className="mt-1 text-sm font-semibold text-blue-900">
                Pay now with FPS or PayMe on Airwallex&apos;s secure checkout.
                Runners only see your order after payment confirms.
              </p>
              <div className="mt-3 rounded-xl bg-white p-3">
                <PaymentMethodPicker
                  value={paymentMethod}
                  onChange={(method) => {
                    setPaymentMethod(method);
                    savePaymentMethod(method);
                  }}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Preferred wallet on Airwallex Hosted Payment Page.
                </p>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-blue-800">
                {PAYMENT_FLOW_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </section>

            <p className="text-sm text-white/80">
              Completing an order agrees to our{" "}
              <LegalLink href="/terms">Terms &amp; Conditions</LegalLink>.
            </p>

            <div className="fixed inset-x-0 bottom-16 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
              <div className="mx-auto max-w-[480px]">
                <OrderLimitNotice subtotal={subtotal} />
                <button
                  type="submit"
                  disabled={!canSubmit || loading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-fusion-red py-4 text-base font-semibold text-white disabled:opacity-60"
                >
                  <span>
                    {loading ? "Redirecting to pay…" : `Pay with ${paymentMethod}`}
                  </span>
                  <span className="text-sm font-normal">· ${total}</span>
                </button>
                {!canSubmit && (
                  <p className="mt-1.5 text-center text-xs text-gray-500 md:text-white/80">
                    {!college || !hall
                      ? "Choose your college and hall to continue."
                      : "Enter a valid phone number to continue."}
                  </p>
                )}
              </div>
            </div>
          </form>
        </main>
      </LakersWallpaper>
    </AppShell>
  );
}
