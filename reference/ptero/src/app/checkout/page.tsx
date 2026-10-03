"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { DeliveryAddressFields } from "@/components/DeliveryAddressFields";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { CAMPUS } from "@/config/campus";
import { formatDeliveryAddress, getLobbyForHall } from "@/config/locations";
import { useAppState, useUser } from "@/context/AppState";
import { useCart } from "@/context/CartContext";
import {
  DEFAULT_SPECIAL_INSTRUCTIONS,
  ESTIMATED_DELIVERY_MINUTES,
  formatEta,
  getEstimatedDeliveryTime,
  isOverOrderLimit,
  ORDER_LIMIT_MESSAGE,
  PAYMENT_FLOW_STEPS,
  TIP_PRESETS,
} from "@/lib/constants";
import {
  canteenDeliveryFeeHkd,
  isCanteenCart,
  primaryCanteenRestaurantId,
} from "@/lib/canteen/cart";
import { canteenCollegeForRestaurant } from "@/config/canteen/restaurants";
import { calculateDeliveryFee, cartTotalWeightKg } from "@/lib/delivery";
import { lineTotal } from "@/lib/pricing";
import { formInputClassName } from "@/components/DeliveryAddressFields";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useUser();
  const { placeOrder, startGuest } = useAppState();
  const { items, subtotal, sessionId, clearCart } = useCart();

  const canteen = isCanteenCart(items);
  const restaurantId = canteen
    ? primaryCanteenRestaurantId(items.map((c) => ({ id: c.item.id })))
    : null;

  const [compound, setCompound] = useState("");
  const [hall, setHall] = useState("");
  const [lobby, setLobby] = useState("");
  const [guestName, setGuestName] = useState(user?.name && !user.isGuest ? user.name : "");
  const [customerNote, setCustomerNote] = useState("");
  const [tip, setTip] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const estimatedDeliveryAt = useMemo(() => getEstimatedDeliveryTime(), []);
  const weightKg = useMemo(() => cartTotalWeightKg(items), [items]);
  const fee = useMemo(() => {
    if (canteen) {
      return {
        deliveryFee: canteenDeliveryFeeHkd(),
        weightSurcharge: 0,
        distanceSurcharge: 0,
      };
    }
    return calculateDeliveryFee({ weightKg, compound });
  }, [canteen, weightKg, compound]);
  const total = subtotal + fee.deliveryFee + tip;
  const overLimit = isOverOrderLimit(subtotal);
  const canSubmit = Boolean(compound && hall && lobby && guestName.trim() && !overLimit);
  const address = compound && hall ? formatDeliveryAddress(compound, hall) : null;
  const backHref = canteen ? "/canteen" : "/cart";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      const customer =
        user && !user.isGuest ? user : startGuest(guestName.trim());
      const order = placeOrder({
        sessionId,
        customerId: customer.uid,
        customerName: guestName.trim() || customer.name,
        customerEmail: customer.email ?? undefined,
        orderChannel: canteen ? "canteen" : "taste",
        canteenRestaurantId: restaurantId ?? undefined,
        canteenCollege: canteen
          ? canteenCollegeForRestaurant(restaurantId)
          : null,
        items: items.map(({ item, quantity }) => ({
          itemId: item.id,
          name: item.name,
          price: item.salePrice ?? item.price,
          quantity,
          weightKg: item.weightKg,
          image: item.image,
        })),
        compound,
        hall,
        lobby: lobby || getLobbyForHall(hall),
        customerNote: customerNote.trim() || DEFAULT_SPECIAL_INSTRUCTIONS,
        subtotal,
        deliveryFee: fee.deliveryFee,
        tip,
        discountApplied: false,
        discountAmount: 0,
      });
      clearCart();
      router.push(`/track/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <AppShell>
        <PrototypeBanner />
        <AppHeader showBack backHref="/cart" title="Checkout" />
        <main className="mx-auto max-w-[480px] px-4 py-8 text-center">
          <p className="text-sm text-gray-600">Nothing to checkout yet.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-[#ED1C24] underline">
            Go shopping
          </Link>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PrototypeBanner />
      <AppHeader showBack backHref={backHref} title="Checkout" />
      <main className="mx-auto max-w-[480px] px-4 py-4 pb-44 md:pb-8">
        {canteen && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            CityU canteen order · flat HK$10 delivery. If a matching residence
            runner accepts (KLNT / MOS), you get 10% off food.
          </div>
        )}
        {(!user || user.isGuest) && (
          <div className="mb-4 rounded-xl border border-[#ED1C24]/40 bg-white px-4 py-3 text-sm text-gray-800">
            No account needed. Enter your name, hall, and lobby. No phone number.
            {" "}
            <Link href="/login?next=/checkout" className="font-semibold text-[#ED1C24] underline">
              Already have a CityU account? Sign in
            </Link>
          </div>
        )}
        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        {overLimit && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {ORDER_LIMIT_MESSAGE}
          </p>
        )}
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-[#ED1C24]">
          Est. delivery by {formatEta(estimatedDeliveryAt)} (~
          {ESTIMATED_DELIVERY_MINUTES} min after order)
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Order Summary</h2>
            <ul className="mt-3 space-y-2">
              {items.map(({ item, quantity }) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span>
                    {quantity}× {item.name}
                  </span>
                  <span>${lineTotal(item, quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            {address && (
              <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-sm">
                <p className="font-medium">{address}</p>
                <p className="text-xs text-gray-500">Lobby: {lobby || getLobbyForHall(hall)}</p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Your name</h2>
            <p className="mt-1 text-xs text-gray-500">
              The runner writes this on the{" "}
              {canteen ? "canteen bag" : `${CAMPUS.supermarket} bag`}. No phone
              number.
            </p>
            <input
              required
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Full name"
              className={formInputClassName}
            />
          </section>

          <section
            id="delivery-address-editor"
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <h2 className="text-sm font-semibold text-gray-900">CityU delivery</h2>
            <p className="mt-1 text-xs text-gray-500">
              Hall 1–12 · Kowloon Tong or Ma On Shan. Lobby fills in when you pick a hall.
            </p>
            <div className="mt-3">
              <DeliveryAddressFields
                compound={compound}
                hall={hall}
                lobby={lobby}
                onCompoundChange={setCompound}
                onHallChange={setHall}
                onLobbyChange={setLobby}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Note for runner</h2>
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              rows={2}
              placeholder="Substitutions, allergens…"
              className={formInputClassName}
            />
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Tip</h2>
            <div className="mt-2 flex gap-2">
              {TIP_PRESETS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setTip(amount)}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                    tip === amount
                      ? "bg-[#ED1C24] text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {amount === 0 ? "No tip" : `$${amount}`}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-sm">
            <div className="flex justify-between">
              <span>Subtotal (estimate)</span>
              <span>HK${subtotal.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>Delivery</span>
              <span>HK${fee.deliveryFee.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>Tip</span>
              <span>HK${tip.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex justify-between font-bold">
              <span>Estimated total</span>
              <span className="text-[#ED1C24]">HK${total.toFixed(2)}</span>
            </div>
            <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-gray-500">
              {(canteen
                ? [
                    "You pay nothing now. Order first — menu prices are estimates.",
                    "A runner accepts, picks up at the canteen, and delivers to your lobby.",
                    "Matching residence runners unlock 10% off food (delivery stays HK$10).",
                    "You then pay food total plus delivery via Airwallex.",
                  ]
                : PAYMENT_FLOW_STEPS
              ).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="flex w-full items-center justify-center rounded-xl bg-fusion-red py-4 text-base font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Placing order…" : "Place order — pay after delivery"}
          </button>
        </form>
      </main>
    </AppShell>
  );
}
