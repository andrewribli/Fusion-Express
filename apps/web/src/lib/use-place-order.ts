"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useUser, getUserAccountId } from "@/context/UserContext";
import { getLobbyForHall } from "@/data/cuhk-locations";
import { calculateDeliveryFee, cartTotalWeightKg } from "@/lib/delivery";
import {
  getEstimatedDeliveryTime,
  isOverOrderLimit,
  ORDER_LIMIT_MESSAGE,
  resolveSpecialInstructions,
} from "@/lib/constants";
import { notifyOrderPlaced } from "@/lib/notify-email";
import { requestNotificationPermission } from "@/lib/notifications";
import { createOrder } from "@/lib/orders";
import type { CustomerPaymentMethod } from "@/lib/payment-method";
import { getUnitPrice, lineTotal } from "@/lib/pricing";
import { normalizePhone, validatePhone } from "@/lib/auth";

export function usePlaceOrder() {
  const router = useRouter();
  const { user, ensureGuestCheckout } = useUser();
  const { items, sessionId, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const placeOrder = useCallback(
    async (opts: {
      college: string;
      hall: string;
      paymentMethod: CustomerPaymentMethod;
      customerNote?: string;
      tip?: number;
      /** Required for guests; optional when already signed in with a saved phone. */
      phone?: string;
    }) => {
      if (!opts.college || !opts.hall || items.length === 0) {
        setError("Add items and choose your college and hall first.");
        return;
      }

      const phone = (opts.phone ?? user?.phone ?? "").trim();
      const phoneErr = validatePhone(phone);
      if (phoneErr) {
        setError(phoneErr);
        return;
      }

      setLoading(true);
      setError("");
      await requestNotificationPermission();

      let customer = user;
      try {
        // Guests (and signed-in users missing a phone) get a phone-backed account.
        if (
          !customer?.uid ||
          customer.isGuest ||
          !customer.phone ||
          normalizePhone(customer.phone) !== normalizePhone(phone)
        ) {
          customer = await ensureGuestCheckout({
            phone,
            college: opts.college,
            hall: opts.hall,
          });
        }
      } catch (err) {
        setLoading(false);
        setError(
          err instanceof Error
            ? err.message
            : "Could not start guest checkout. Try again.",
        );
        return;
      }

      if (!customer?.uid) {
        setLoading(false);
        setError("Could not create your account. Try again.");
        return;
      }

      const orderItems = items.map(({ item, quantity }) => ({
        itemId: item.id,
        name: item.name,
        price: getUnitPrice(item),
        quantity,
        weightKg: item.weightKg,
      }));
      const orderSubtotal = items.reduce(
        (sum, line) => sum + lineTotal(line.item, line.quantity),
        0,
      );
      if (isOverOrderLimit(orderSubtotal)) {
        setLoading(false);
        setError(ORDER_LIMIT_MESSAGE);
        return;
      }
      const fee = calculateDeliveryFee({
        weightKg: cartTotalWeightKg(items),
        college: opts.college,
      });
      const tipAmount = opts.tip ?? 0;
      const total = orderSubtotal + fee.deliveryFee + tipAmount;
      const estimatedDeliveryAt = getEstimatedDeliveryTime();
      const digits = normalizePhone(phone);

      try {
        const orderId = await createOrder({
          sessionId,
          customerId: getUserAccountId(customer),
          customerName:
            customer.fullName?.trim() && customer.fullName !== "Guest"
              ? customer.fullName
              : `Guest ${digits.slice(-4)}`,
          customerEmail: customer.email,
          customerPhone: digits,
          items: orderItems,
          status: "pending",
          college: opts.college,
          hall: opts.hall,
          lobbyPoint: getLobbyForHall(opts.hall),
          zone: fee.zone,
          totalWeight: fee.weightKg,
          customerNote: resolveSpecialInstructions(
            [
              opts.customerNote?.trim(),
              ...new Set(
                items
                  .map(({ item }) => item.itemNote)
                  .filter((note): note is string => Boolean(note)),
              ),
            ]
              .filter(Boolean)
              .join("\n"),
          ),
          subtotal: orderSubtotal,
          deliveryFee: fee.deliveryFee,
          tip: tipAmount || undefined,
          total,
          paymentReceived: false,
          paymentMethod: opts.paymentMethod,
          fusionPaidByPlatform: false,
          estimatedDeliveryAt,
        });

        void notifyOrderPlaced({
          customerEmail: customer.email,
          orderId,
          items: orderItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          total,
        });

        clearCart();
        const guestFlag = customer.isGuest ? "&guest=1" : "";
        router.push(`/track?orderId=${orderId}${guestFlag}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not place order. Try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [clearCart, ensureGuestCheckout, items, router, sessionId, user],
  );

  return { placeOrder, loading, error, setError };
}
