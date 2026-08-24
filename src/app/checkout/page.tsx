"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { ConfirmOrderModal } from "@/components/ConfirmOrderModal";
import { DeliveryAddressFields } from "@/components/DeliveryAddressFields";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { RequireAuth } from "@/components/RequireAuth";
import { useCart } from "@/context/CartContext";
import { useUser, getUserAccountId } from "@/context/UserContext";
import { lineTotal, getUnitPrice } from "@/lib/pricing";
import { formatDeliveryAddress, getLobbyForHall } from "@/data/cuhk-locations";
import {
  ESTIMATED_DELIVERY_MINUTES,
  getEstimatedDeliveryTime,
  formatEta,
  TIP_PRESETS,
} from "@/lib/constants";
import { createOrder } from "@/lib/orders";
import { requestNotificationPermission } from "@/lib/notifications";
import { DELIVERY_FEE } from "@/lib/types";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useUser();
  const { items, subtotal, sessionId, clearCart } = useCart();

  const [college, setCollege] = useState(user?.college ?? "");
  const [hall, setHall] = useState(user?.hall ?? "");
  const [roomNumber, setRoomNumber] = useState(user?.roomNumber ?? "");
  const [customerNote, setCustomerNote] = useState("");
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [placeError, setPlaceError] = useState("");

  const estimatedDeliveryAt = useMemo(() => getEstimatedDeliveryTime(), []);
  const tipAmount = customTip ? Number(customTip) || 0 : tip;
  const total = subtotal + DELIVERY_FEE + tipAmount;
  const address =
    college && hall
      ? formatDeliveryAddress(college, hall, roomNumber || undefined)
      : null;

  async function placeOrder() {
    if (!college || !hall || items.length === 0) return;
    setLoading(true);
    setPlaceError("");
    await requestNotificationPermission();

    const orderItems = items.map(({ item, quantity }) => ({
      itemId: item.id,
      name: item.name,
      price: getUnitPrice(item),
      quantity,
    }));
    const orderSubtotal = items.reduce(
      (sum, c) => sum + lineTotal(c.item, c.quantity),
      0,
    );

    try {
      const orderId = await createOrder({
        sessionId,
        customerId: getUserAccountId(user!),
        customerName: user!.fullName,
        items: orderItems,
        status: "pending",
        college,
        hall,
        roomNumber: roomNumber.trim() || undefined,
        lobbyPoint: getLobbyForHall(hall),
        customerNote: [
          customerNote.trim(),
          ...new Set(
            items
              .map(({ item }) => item.itemNote)
              .filter((note): note is string => Boolean(note)),
          ),
        ]
          .filter(Boolean)
          .join("\n") || undefined,
        subtotal: orderSubtotal,
        deliveryFee: DELIVERY_FEE,
        tip: tipAmount || undefined,
        total,
        paymentReceived: false,
        estimatedDeliveryAt,
      });

      clearCart();
      setShowConfirm(false);
      router.push(`/track?orderId=${orderId}`);
    } catch (err) {
      setShowConfirm(false);
      setPlaceError(
        err instanceof Error ? err.message : "Could not place order. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!college || !hall) return;
    setShowConfirm(true);
  }

  if (items.length === 0) {
    return (
      <RequireAuth>
        <AppShell>
          <LakersWallpaper>
            <AppHeader showBack backHref="/cart" title="Checkout" />
            <main className="mx-auto max-w-[480px] px-4 py-8 text-center">
              <p className="text-sm text-white/80">Nothing to checkout.</p>
              <Link href="/home" className="mt-4 inline-block text-lakers-gold underline">
                Go shopping
              </Link>
            </main>
          </LakersWallpaper>
        </AppShell>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <AppShell>
        <LakersWallpaper>
          <AppHeader showBack backHref="/cart" title="Checkout" />

          <main className="mx-auto max-w-[480px] px-4 py-4">
            <PriceDisclaimer className="mb-4" />
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
                    <span>{quantity}× {item.name}</span>
                    <span>${lineTotal(item, quantity)}</span>
                  </li>
                ))}
              </ul>
              {address && (
                <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-sm">
                  <p className="font-medium">{address}</p>
                  <p className="text-xs text-gray-500">
                    Lobby: {getLobbyForHall(hall)}
                  </p>
                </div>
              )}
              <div className="mt-4 space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal (est.)</span>
                  <span>${subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery fee</span>
                  <span>${DELIVERY_FEE}</span>
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
              </div>
            </section>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold">Delivery Details</h2>
                <div className="mt-3">
                  <DeliveryAddressFields
                    college={college}
                    hall={hall}
                    roomNumber={roomNumber}
                    onCollegeChange={setCollege}
                    onHallChange={setHall}
                    onRoomNumberChange={setRoomNumber}
                  />
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600">
                    Delivery instructions (optional)
                  </label>
                  <textarea
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    placeholder="e.g. Leave at front desk"
                    rows={2}
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

              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                Pay via PayMe or FPS after delivery.
              </div>

              <button
                type="submit"
                disabled={!college || !hall}
                className="w-full rounded-xl bg-fusion-red py-4 text-base font-semibold text-white"
              >
                Review &amp; Place Order
              </button>
            </form>
          </main>

          <ConfirmOrderModal
            open={showConfirm}
            onConfirm={placeOrder}
            onCancel={() => setShowConfirm(false)}
            loading={loading}
            items={items.map(({ item, quantity }) => ({
              name: item.name,
              quantity,
              price: item.price,
            }))}
            subtotal={subtotal}
            tip={tipAmount}
            college={college}
            hall={hall}
            roomNumber={roomNumber.trim() || undefined}
            customerNote={customerNote.trim() || undefined}
            estimatedDeliveryAt={estimatedDeliveryAt}
          />
        </LakersWallpaper>
      </AppShell>
    </RequireAuth>
  );
}
