"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { CampusPickerCards } from "@/components/CampusPickerCards";
import { CustomItemCard } from "@/components/CustomItemCard";
import { DeliveryAddressFields } from "@/components/DeliveryAddressFields";
import { ProductSearchPanel } from "@/components/ProductSearchPanel";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { LegalLink } from "@/components/LegalLink";
import { useCart } from "@/context/CartContext";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";
import { lineTotal } from "@/lib/pricing";
import {
  formatDeliveryAddress,
  getLobbyForHall,
} from "@/data/cuhk-locations";
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
import { PlaceOrderConfirmModal } from "@/components/PlaceOrderConfirmModal";
import { usePlaceOrder } from "@/lib/use-place-order";
import { resolveOrderDeliveryFee } from "@/lib/order-delivery";
import { DeliveryFeeBreakdown } from "@/components/DeliveryFeeBreakdown";
import { DeliveryQuote } from "@/components/DeliveryQuote";
import { getCanteenCheckoutGate, isCanteenCart } from "@/lib/canteen/cart";
import { useIsAdmin } from "@/lib/use-is-admin";
import {
  formatScheduledLabel,
  resolveDeliveryTiming,
  resolveOrderVenue,
} from "@/lib/order-window";
import { ScheduleDelivery } from "@/components/ScheduleDelivery";
import { campusConfig, type CampusId } from "@fusion-express/shared/campus";
import { PLATFORM_FEE, previewCustomerSavings } from "@fusion-express/shared";
import { cartCampus, cartCampusError } from "@/lib/cart-campus";
import {
  canteenNameForRestaurant,
  restaurantIdFromCanteenItemId,
} from "@fusion-express/shared/canteen-college";

export default function CheckoutPage() {
  const { user } = useUser();
  const { setCampus } = useCampus();
  const { items, subtotal } = useCart();
  const { placeOrder, loading, error: placeError } = usePlaceOrder();

  /** Signed-in campus from signup — not a homepage picker. */
  const lockedCampus: CampusId | null =
    user?.campus === "cuhk" || user?.campus === "cityu" ? user.campus : null;
  /** Guests pick campus here before dorms. */
  const [guestCampus, setGuestCampus] = useState<CampusId | null>(null);
  const [college, setCollege] = useState("");
  const [hall, setHall] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const isAdmin = useIsAdmin(user?.uid);
  const onDeliveryMode = useCallback((mode: "now" | "schedule") => {
    setDeliveryMode(mode);
  }, []);

  useEffect(() => {
    if (lockedCampus) {
      setCampus(lockedCampus);
      setGuestCampus(null);
    }
  }, [lockedCampus, setCampus]);

  const itemsCampus = cartCampus(items);
  /** Cart channel fixes campus (canteen / one-campus grocery); no cross-university pick. */
  const cartLockedCampus = itemsCampus;
  const deliveryCampusLock = lockedCampus ?? cartLockedCampus;

  useEffect(() => {
    if (deliveryCampusLock) {
      setCampus(deliveryCampusLock);
      if (!lockedCampus) {
        setGuestCampus(deliveryCampusLock);
      }
    }
  }, [deliveryCampusLock, lockedCampus, setCampus]);

  const campus = deliveryCampusLock ?? guestCampus;
  const canteenOrder = isCanteenCart(items);
  const campusError = cartCampusError(items, campus);
  const canteenGate = getCanteenCheckoutGate(items, { adminBypass: isAdmin });
  const canteenHardError =
    isCanteenCart(items) && !canteenGate.allowed && !canteenGate.hoursClosed
      ? canteenGate.message
      : null;
  const venue = useMemo(() => {
    const restaurantId = items
      .map(({ item }) => restaurantIdFromCanteenItemId(item.id))
      .find((id): id is string => Boolean(id));
    const wellcome = items.some(({ item }) => item.id.startsWith("wellcome:"));
    const orderCampus = campus === "cityu" ? "cityu" : "cuhk";
    return resolveOrderVenue({
      campus: orderCampus,
      itemIds: items.map(({ item }) => item.id),
      sourceId: restaurantId
        ? restaurantId
        : wellcome
          ? "wellcome"
          : orderCampus === "cityu"
            ? "taste"
            : "fusion",
      orderChannel: canteenOrder
        ? "canteen"
        : wellcome
          ? "wellcome"
          : orderCampus === "cityu"
            ? "taste"
            : "fusion",
      canteenRestaurantId: restaurantId,
    });
  }, [campus, canteenOrder, items]);
  const timing = useMemo(
    () =>
      resolveDeliveryTiming({
        venue,
        isAdmin,
        mode: deliveryMode,
        date: scheduleDate,
        time: scheduleTime,
      }),
    [venue, isAdmin, deliveryMode, scheduleDate, scheduleTime],
  );
  const estimatedDeliveryAt = useMemo(() => getEstimatedDeliveryTime(), []);
  const tipAmount = Math.max(0, customTip ? Number(customTip) || 0 : tip);
  const fee = useMemo(
    () => resolveOrderDeliveryFee(items, college, campus ?? "cuhk", hall),
    [items, college, campus, hall],
  );
  const pickup = useMemo(() => {
    for (const { item } of items) {
      const restaurantId = restaurantIdFromCanteenItemId(item.id);
      if (restaurantId) {
        return {
          label: canteenNameForRestaurant(restaurantId),
          restaurantId,
        };
      }
      if (item.id.startsWith("wellcome:")) {
        return { label: "Wellcome", restaurantId: null as string | null };
      }
    }
    if (campus === "cityu") return { label: "Taste", restaurantId: null };
    return { label: "Fusion", restaurantId: null };
  }, [items, campus]);
  const pickupLabel = pickup.label;
  const collegeSavings =
    campus === "cuhk"
      ? previewCustomerSavings({ campus, restaurantId: pickup.restaurantId })
      : 0;
  const total =
    subtotal + fee.deliveryFee + tipAmount + PLATFORM_FEE - collegeSavings;
  const overLimit = isOverOrderLimit(subtotal);
  const canSubmit = Boolean(
    campus &&
      college &&
      hall &&
      !overLimit &&
      !campusError &&
      !canteenHardError &&
      timing.allowed &&
      fee.quote.available !== false &&
      !fee.quote.pending,
  );
  const shopHref = isCanteenCart(items)
    ? "/canteen"
    : campusConfig[campus ?? "cuhk"].groceryPath;
  const address =
    college && hall
      ? formatDeliveryAddress(college, hall)
      : null;
  const lobby = hall && campus ? getLobbyForHall(hall, campus) : "";

  function handleCampusChange(next: CampusId) {
    if (deliveryCampusLock) return;
    setGuestCampus(next);
    setCampus(next);
    setCollege("");
    setHall("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !campus) return;
    setConfirmOpen(true);
  }

  function handleConfirmPlaceOrder() {
    if (!canSubmit || !campus) return;
    setConfirmOpen(false);
    void placeOrder({
      campus,
      college,
      hall,
      customerNote: customerNote.trim() || DEFAULT_SPECIAL_INSTRUCTIONS,
      tip: tipAmount,
      scheduledFor: timing.scheduledFor ?? undefined,
    });
  }

  if (items.length === 0) {
    return (
      <AppShell>
        <LakersWallpaper>
          <AppHeader showBack backHref="/cart" title="Checkout" />
          <main className="mx-auto max-w-[480px] px-4 py-8">
            <p className="text-center text-base text-white/80">
              Add items to place an order
            </p>
            <ProductSearchPanel
              className="mt-4"
              placeholder="Search to add an item…"
            />
            <CustomItemCard className="mt-4" />
            <p className="mt-4 text-center">
              <Link href={shopHref} className="text-lakers-gold underline">
                Keep shopping
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
              No account needed. Enter your dorm and lobby — we&apos;ll
              save the order when you submit.{" "}
              <Link href="/login?next=/checkout" className="underline">
                Already have an account? Sign in
              </Link>
            </div>
          )}
          {placeError && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-base text-red-700">
              <p>{placeError}</p>
              <p className="mt-2">
                Try again, or contact support with the chat button.
              </p>
            </div>
          )}
          {campusError && (
            <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {campusError}
            </p>
          )}
          {canteenHardError && (
            <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              {canteenHardError}
            </p>
          )}
          {canteenGate.hoursClosed && canteenGate.message ? (
            <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              {canteenGate.message}
            </p>
          ) : null}
          <div className="mb-4 rounded-xl bg-lakers-gold/20 px-4 py-3 text-sm font-medium text-lakers-gold">
            {timing.scheduledFor
              ? `Scheduled for ${formatScheduledLabel(new Date(timing.scheduledFor))}`
              : `Est. delivery by ${formatEta(estimatedDeliveryAt)} (~${ESTIMATED_DELIVERY_MINUTES} min after order)`}
          </div>
          <ScheduleDelivery
            venue={venue}
            isAdmin={isAdmin}
            mode={deliveryMode}
            date={scheduleDate}
            time={scheduleTime}
            onMode={onDeliveryMode}
            onDate={setScheduleDate}
            onTime={setScheduleTime}
            error={deliveryMode === "schedule" ? timing.error : null}
          />

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
              {fee.quote.pricing === "cuhk-graph" || fee.quote.pricing.startsWith("cityu") ? (
                <div className="mt-2">
                  <DeliveryQuote quote={fee.quote} large fromLabel={pickupLabel} />
                </div>
              ) : (
                <DeliveryFeeBreakdown breakdown={fee} />
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tip</span>
                  <span>${tipAmount}</span>
                </div>
              )}
              {collegeSavings > 0 && (
                <>
                  <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
                    College discount applied — you save HK${collegeSavings.toFixed(0)}
                  </p>
                  <div className="flex justify-between font-medium text-emerald-800">
                    <span>College discount</span>
                    <span>−HK${collegeSavings.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Applies when a matching-college runner accepts. A runner from
                    another college removes this HK${collegeSavings.toFixed(0)}.
                  </p>
                </>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Platform fee</span>
                <span>${PLATFORM_FEE.toFixed(2)}</span>
              </div>
              <div
                className={`flex justify-between pt-1 text-base font-bold ${
                  overLimit ? "text-[#ED1C24]" : ""
                }`}
              >
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
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
                {deliveryCampusLock
                  ? deliveryCampusLock === "cityu"
                    ? canteenOrder
                      ? "CityU canteen — hall lobby delivery. No phone number."
                      : "Delivering to your CityU hall lobby. No phone number."
                    : canteenOrder
                      ? "CUHK canteen — dorm lobby delivery. No phone number."
                      : "Delivering to your CUHK dorm lobby. No phone number."
                  : campus === "cityu"
                    ? "Campus, compound, hall, and lobby. No phone number."
                    : "Pick your university first, then dorm and lobby. No phone number."}
              </p>
              {deliveryCampusLock ? (
                <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">
                  {deliveryCampusLock === "cityu" ? "CityU" : "CUHK"}
                </p>
              ) : (
                <div className="mt-3">
                  <CampusPickerCards
                    value={guestCampus}
                    onChange={handleCampusChange}
                  />
                </div>
              )}
              {campus ? (
                <div className="mt-3">
                  <DeliveryAddressFields
                    campus={campus}
                    college={college}
                    hall={hall}
                    onCollegeChange={setCollege}
                    onHallChange={setHall}
                  />
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500">
                  Choose your university to see dorm options.
                </p>
              )}
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
                No payment now. You pay the exact receipt total with card, FPS,
                or PayMe after the runner delivers.
              </p>
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
                    {loading ? "Placing…" : "Complete Order"}
                  </span>
                  <span className="text-sm font-normal">· ${total}</span>
                </button>
                {campusError ? (
                  <p className="mt-1.5 text-center text-xs font-semibold text-[#ED1C24]">
                    {campusError}
                  </p>
                ) : fee.quote.available === false ? (
                  <p className="mt-1.5 text-center text-xs font-semibold text-[#ED1C24] md:text-white">
                    {fee.quote.unavailableMessage}
                  </p>
                ) : timing.error ? (
                  <p className="mt-1.5 text-center text-xs font-semibold text-amber-200">
                    {timing.error}
                  </p>
                ) : !canSubmit ? (
                  <p className="mt-1.5 text-center text-xs text-gray-500 md:text-white/80">
                    Choose your {campus === "cityu" ? "compound" : "college"} and
                    hall to continue.
                  </p>
                ) : null}
              </div>
            </div>
          </form>
        </main>
      </LakersWallpaper>
      <PlaceOrderConfirmModal
        open={confirmOpen}
        loading={loading}
        deliveryLine={
          address
            ? `${address}${lobby ? ` · ${lobby}` : ""}`
            : null
        }
        totalLabel={`Estimated total · $${total.toFixed(2)}`}
        onConfirm={handleConfirmPlaceOrder}
        onCancel={() => setConfirmOpen(false)}
      />
    </AppShell>
  );
}
