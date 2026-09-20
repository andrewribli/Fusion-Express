"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { formatDeliveryAddress, getLobbyForHall } from "@/data/cuhk-locations";
import { calculateDeliveryFee, cartTotalWeightKg } from "@/lib/delivery";
import {
  getEstimatedDeliveryTime,
  isOverOrderLimit,
  ORDER_LIMIT_MESSAGE,
  resolveSpecialInstructions,
} from "@/lib/constants";
import { friendlyPlaceOrderError } from "@/lib/auth-errors";
import { notifyOrderPlaced } from "@/lib/notify-email";
import { requestNotificationPermission } from "@/lib/notifications";
import { createOrder } from "@/lib/orders";
import { getUnitPrice, lineTotal } from "@/lib/pricing";

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
      customerNote?: string;
      tip?: number;
    }) => {
      if (!opts.college || !opts.hall || items.length === 0) {
        setError("Add items and choose your college and hall first.");
        return;
      }

      const fullName =
        user?.fullName && user.fullName !== "Guest"
          ? user.fullName.trim()
          : "Guest";

      setLoading(true);
      setError("");

      try {
        await requestNotificationPermission();

        const customer = await ensureGuestCheckout({
          fullName,
          college: opts.college,
          hall: opts.hall,
        });

        if (!customer?.uid) {
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
          setError(ORDER_LIMIT_MESSAGE);
          return;
        }
        const fee = calculateDeliveryFee({
          weightKg: cartTotalWeightKg(items),
          college: opts.college,
        });
        // Reject negative tips; clamp rather than blocking submit.
        const tipAmount = Math.max(0, opts.tip ?? 0);
        const total = orderSubtotal + fee.deliveryFee + tipAmount;
        const estimatedDeliveryAt = getEstimatedDeliveryTime();
        const lobbyPoint = getLobbyForHall(opts.hall);
        const customerName = customer.fullName.trim();

        const orderId = await createOrder({
          sessionId,
          // New orders always key on Auth uid (never studentId/email fallback).
          customerId: customer.uid,
          customerName,
          customerEmail: customer.email,
          items: orderItems,
          status: "pending",
          college: opts.college,
          hall: opts.hall,
          lobbyPoint,
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
          customerName,
          deliveryLocation: `${formatDeliveryAddress(opts.college, opts.hall)} · Lobby: ${lobbyPoint}`,
        });

        clearCart();
        const guestFlag = customer.isGuest ? "&guest=1" : "";
        router.push(`/track?orderId=${orderId}${guestFlag}`);
      } catch (err) {
        setError(friendlyPlaceOrderError(err));
      } finally {
        setLoading(false);
      }
    },
    [clearCart, ensureGuestCheckout, items, router, sessionId, user],
  );

  return { placeOrder, loading, error, setError };
}
