"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { DeliveryAddressFields } from "@/components/DeliveryAddressFields";
import { PaymentMethodPicker } from "@/components/PaymentMethodPicker";
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
import { validatePhone } from "@/lib/auth";
import {
  adjustedDeliveryFee,
  DELIVERY_MODES,
  type DeliveryMode,
} from "@/lib/delivery-modes";
import {
  computeCartFees,
  PACKAGING_FEE,
  PLATFORM_FEE,
} from "@/lib/cart-fees";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useUser();
  const { items, subtotal } = useCart();
  const { placeOrder, loading, error: placeError } = usePlaceOrder("fusion");

  const [college, setCollege] = useState("");
  const [hall, setHall] = useState("");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [customerNote, setCustomerNote] = useState("");
  const [leaveAtDoor, setLeaveAtDoor] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("standard");
  const [scheduledFor, setScheduledFor] = useState("");
  const [tipSelected, setTipSelected] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<CustomerPaymentMethod>("PayMe");
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    setPaymentMethod(loadPaymentMethod());
  }, []);

  useEffect(() => {
    if (user?.phone && !phone) setPhone(user.phone);
  }, [user, phone]);

  const estimatedDeliveryAt = useMemo(() => getEstimatedDeliveryTime(), []);
  const tipAmount = Math.max(
    0,
    customTip ? Number(customTip) || 0 : tipSelected ?? 0,
  );
  const weightKg = useMemo(() => cartTotalWeightKg(items), [items]);
  const fee = useMemo(
    () => calculateDeliveryFee({ weightKg, college }),
    [weightKg, college],
  );
  const deliveryFee = adjustedDeliveryFee(fee.deliveryFee, deliveryMode);
  const cartExtras = computeCartFees({
    items,
    subtotal,
    college,
    fulfillment: "delivery",
  });
  /** Extra line fees folded into deliveryFee for the existing place-order API. */
  const deliveryFeeCharged =
    Math.round(
      (deliveryFee +
        cartExtras.smallOrderFee +
        PACKAGING_FEE +
        PLATFORM_FEE) *
        100,
    ) / 100;
  const total =
    Math.round((subtotal + deliveryFeeCharged + tipAmount) * 100) / 100;
  const overLimit = isOverOrderLimit(subtotal);
  const phoneOk = !validatePhone(phone);
  const scheduledOk =
    deliveryMode !== "scheduled" || Boolean(scheduledFor.trim());
  const canSubmit = Boolean(
    college && hall && phoneOk && !overLimit && scheduledOk,
  );
  const address =
    college && hall ? formatDeliveryAddress(college, hall) : null;
  const lobby = hall ? getLobbyForHall(hall) : "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const noteParts = [
      customerNote.trim() || DEFAULT_SPECIAL_INSTRUCTIONS,
      leaveAtDoor ? "Leave at door / lobby desk if I’m not there." : "",
    ].filter(Boolean);
    void placeOrder({
      college,
      hall,
      phone,
      paymentMethod,
      customerNote: noteParts.join("\n"),
      tip: tipAmount,
      deliveryFeeOverride: deliveryFeeCharged,
      deliveryModeLabel: DELIVERY_MODES.find((m) => m.id === deliveryMode)?.label,
      scheduledFor:
        deliveryMode === "scheduled" && scheduledFor
          ? new Date(scheduledFor).toISOString()
          : undefined,
    });
  }

  if (items.length === 0) {
    return (
      <AppShell hideNav>
        <div className="mx-auto max-w-lg px-4 py-12 text-center">
          <p className="text-sm text-gray-600">Your Fusion cart is empty.</p>
          <Link
            href="/fusion"
            className="mt-4 inline-flex h-12 items-center rounded-full bg-[#ED1C24] px-6 text-sm font-bold text-white"
          >
            Shop Fusion
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideNav>
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-white">
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-white px-3 py-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/cart")}
              className="flex h-11 w-11 items-center justify-center rounded-full text-gray-800 hover:bg-gray-50"
              aria-label="Back to cart"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <path
                  d="M15 6L9 12l6 6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold text-gray-900">Checkout</p>
              <p className="truncate text-xs text-gray-500">Fusion@CUHK</p>
            </div>
            <ol className="flex items-center gap-1.5" aria-label="Checkout progress">
              {["Cart", "Checkout", "Done"].map((label, i) => (
                <li key={label} className="flex items-center gap-1.5">
                  <span
                    className="flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: i <= 1 ? "#ED1C24" : "#d1d5db" }}
                    aria-current={i === 1 ? "step" : undefined}
                    title={label}
                  />
                  {i < 2 && <span className="h-px w-3 bg-gray-200" aria-hidden />}
                </li>
              ))}
            </ol>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <main className="flex-1 space-y-4 overflow-y-auto px-3 py-3 pb-36">
            {!user && (
              <div className="rounded-xl bg-gray-50 px-3 py-3 text-sm text-gray-700">
                No account needed — we create your guest profile when you order.{" "}
                <Link href="/login?next=/checkout" className="font-semibold text-[#ED1C24] underline">
                  Sign in
                </Link>
              </div>
            )}
            {placeError && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {placeError}
              </p>
            )}

            <section className="rounded-2xl border border-gray-100 p-4">
              <h2 className="text-sm font-bold text-gray-900">Delivery address</h2>
              <div className="mt-3">
                <DeliveryAddressFields
                  college={college}
                  hall={hall}
                  onCollegeChange={setCollege}
                  onHallChange={setHall}
                />
              </div>
              {address && (
                <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-sm">
                  <p className="font-semibold text-gray-900">{address}</p>
                  <p className="text-xs text-gray-500">Lobby: {lobby}</p>
                </div>
              )}
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
                  className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 px-4 text-sm focus:border-[#ED1C24] focus:outline-none"
                />
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600">
                  Delivery instructions
                </label>
                <textarea
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder={DEFAULT_SPECIAL_INSTRUCTIONS}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#ED1C24] focus:outline-none"
                />
              </div>
              <label className="mt-3 flex min-h-11 items-center gap-3 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={leaveAtDoor}
                  onChange={(e) => setLeaveAtDoor(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-[#ED1C24]"
                />
                Leave at door / lobby desk
              </label>
            </section>

            <section className="rounded-2xl border border-gray-100 p-4">
              <h2 className="text-sm font-bold text-gray-900">Delivery speed</h2>
              <p className="mt-1 text-xs text-gray-500">
                Est. ~{ESTIMATED_DELIVERY_MINUTES} min · by{" "}
                {formatEta(estimatedDeliveryAt)} (Standard)
              </p>
              <div className="mt-3 space-y-2" role="radiogroup" aria-label="Delivery mode">
                {DELIVERY_MODES.map((mode) => {
                  const price = adjustedDeliveryFee(fee.deliveryFee, mode.id);
                  const selected = deliveryMode === mode.id;
                  return (
                    <label
                      key={mode.id}
                      className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2"
                      style={{
                        borderColor: selected ? "#ED1C24" : "#e5e7eb",
                        backgroundColor: selected ? "rgba(237,28,36,0.04)" : "#ffffff",
                      }}
                    >
                      <input
                        type="radio"
                        name="delivery-mode"
                        checked={selected}
                        onChange={() => setDeliveryMode(mode.id)}
                        className="h-4 w-4 text-[#ED1C24]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-gray-900">
                          {mode.label}
                        </span>
                        <span className="block text-xs text-gray-500">{mode.hint}</span>
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        HK${price}
                      </span>
                    </label>
                  );
                })}
              </div>
              {deliveryMode === "scheduled" && (
                <div className="mt-3">
                  <label
                    htmlFor="scheduled-for"
                    className="block text-xs font-medium text-gray-600"
                  >
                    Drop-off time
                  </label>
                  <input
                    id="scheduled-for"
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 px-3 text-sm"
                    required={deliveryMode === "scheduled"}
                  />
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-100 p-4">
              <h2 className="text-sm font-bold text-gray-900">Tip your runner</h2>
              <p className="mt-1 text-xs text-gray-500">
                100% of tips go to your runner. No tip is selected by default.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TIP_PRESETS.filter((amount) => amount > 0).map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setTipSelected(amount);
                      setCustomTip("");
                    }}
                    className="min-h-11 rounded-full px-4 text-sm font-bold"
                    style={{
                      backgroundColor:
                        tipSelected === amount && !customTip ? "#ED1C24" : "#f3f4f6",
                      color:
                        tipSelected === amount && !customTip ? "#ffffff" : "#374151",
                    }}
                  >
                    HK${amount}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setTipSelected(null);
                    setCustomTip("");
                  }}
                  className="min-h-11 rounded-full px-4 text-sm font-bold"
                  style={{
                    backgroundColor:
                      tipSelected == null && !customTip ? "#ED1C24" : "#f3f4f6",
                    color:
                      tipSelected == null && !customTip ? "#ffffff" : "#374151",
                  }}
                >
                  No tip
                </button>
              </div>
              <input
                type="number"
                min={0}
                value={customTip}
                onChange={(e) => {
                  setCustomTip(e.target.value);
                  setTipSelected(null);
                }}
                placeholder="Custom tip (HK$)"
                className="mt-2 min-h-11 w-full rounded-xl border border-gray-200 px-4 text-sm"
              />
              {tipAmount > 0 && (
                <p className="mt-2 text-xs font-semibold text-emerald-700">
                  Tip HK${tipAmount} → 100% to runner
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <h2 className="text-sm font-bold text-blue-900">Payment</h2>
              <p className="mt-1 text-sm text-blue-900">
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
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-blue-800">
                {PAYMENT_FLOW_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-gray-100">
              <button
                type="button"
                onClick={() => setSummaryOpen((v) => !v)}
                className="flex min-h-12 w-full items-center justify-between px-4 text-left text-sm font-bold text-gray-900"
                aria-expanded={summaryOpen}
              >
                Order summary ({items.length})
                <span className="text-gray-400">{summaryOpen ? "▴" : "▾"}</span>
              </button>
              {summaryOpen && (
                <div className="space-y-2 border-t border-gray-100 px-4 py-3 text-sm">
                  {items.map(({ item, quantity, selectedOptions }) => (
                    <div key={item.id} className="flex justify-between gap-2">
                      <span className="min-w-0">
                        {quantity}× {item.name}
                        {selectedOptions?.ripeness != null && (
                          <span className="block text-xs text-gray-500">
                            Ripeness {selectedOptions.ripeness}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0">HK${lineTotal(item, quantity)}</span>
                    </div>
                  ))}
                  <div className="space-y-1 border-t border-gray-100 pt-2 text-gray-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>HK${subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery ({deliveryMode})</span>
                      <span>HK${deliveryFee}</span>
                    </div>
                    {cartExtras.smallOrderFee > 0 && (
                      <div className="flex justify-between">
                        <span>Small order fee</span>
                        <span>HK${cartExtras.smallOrderFee}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Packaging</span>
                      <span>HK${PACKAGING_FEE}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform fee</span>
                      <span>HK${PLATFORM_FEE}</span>
                    </div>
                    {tipAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Tip (100% to runner)</span>
                        <span>HK${tipAmount}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <OrderLimitNotice subtotal={subtotal} />
          </main>

          <div
            className="sticky bottom-0 border-t border-gray-100 bg-white px-3 py-3"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <p className="mb-2 text-center text-xs text-gray-500">
              By placing an order you agree to our{" "}
              <LegalLink href="/terms">Terms &amp; Conditions</LegalLink>.
            </p>
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="flex h-[52px] w-full items-center justify-center rounded-full text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: "#ED1C24" }}
            >
              {loading ? "Placing…" : `Place Order · HK$${total}`}
            </button>
            {!canSubmit && (
              <p className="mt-1.5 text-center text-xs text-gray-500">
                {!college || !hall
                  ? "Choose your college and hall to continue."
                  : !scheduledOk
                    ? "Pick a scheduled drop-off time."
                    : "Enter a valid phone number to continue."}
              </p>
            )}
          </div>
        </form>
      </div>
    </AppShell>
  );
}
