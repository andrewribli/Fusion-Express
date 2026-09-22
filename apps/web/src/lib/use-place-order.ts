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
import type { CustomerPaymentMethod } from "@/lib/payment-method";
import { getUnitPrice, lineTotal } from "@/lib/pricing";
import { normalizePhone, validatePhone } from "@/lib/auth";
import {
  CANTEEN_DELIVERY_FEE,
  getRestaurant,
} from "@fusion-express/shared/canteen";
import {
  parseCanteenItemId,
  type ShopKind,
} from "@fusion-express/shared/shop-kind";

export function usePlaceOrder(forcedShopKind?: ShopKind) {
  const router = useRouter();
  const { user, ensureGuestCheckout } = useUser();
  const { items, sessionId, clearCart, shopKind: cartShopKind } = useCart();
  const shopKind = forcedShopKind ?? cartShopKind;
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

      // Guardrail: never place a mixed or wrong-shop order from this cart.
      const hasCanteen = items.some((line) =>
        line.item.id.startsWith("canteen:"),
      );
      const hasFusion = items.some(
        (line) => !line.item.id.startsWith("canteen:"),
      );
      if (hasCanteen && hasFusion) {
        setError(
          "Fusion groceries and canteen food can’t be in the same order. Clear one cart and try again.",
        );
        return;
      }
      if (shopKind === "fusion" && hasCanteen) {
        setError("This is Fusion checkout — remove canteen items first.");
        return;
      }
      if (shopKind === "canteen" && hasFusion) {
        setError("This is canteen checkout — remove Fusion grocery items first.");
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

      try {
        await requestNotificationPermission();

        let customer = user;
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

        const weightKg = cartTotalWeightKg(items);
        const fee =
          shopKind === "canteen"
            ? {
                baseFee: CANTEEN_DELIVERY_FEE,
                weightKg,
                extraKg: 0,
                weightSurcharge: 0,
                zone: 1 as const,
                distanceSurcharge: 0,
                deliveryFee: CANTEEN_DELIVERY_FEE,
              }
            : calculateDeliveryFee({
                weightKg,
                college: opts.college,
              });

        const tipAmount = Math.max(0, opts.tip ?? 0);
        const total = orderSubtotal + fee.deliveryFee + tipAmount;
        const estimatedDeliveryAt = getEstimatedDeliveryTime();
        const digits = normalizePhone(phone);
        const lobbyPoint = getLobbyForHall(opts.hall);
        const customerName =
          customer.fullName?.trim() && customer.fullName !== "Guest"
            ? customer.fullName
            : `Guest ${digits.slice(-4)}`;

        const canteenIds = new Set(
          items
            .map((line) => parseCanteenItemId(line.item.id)?.restaurantId)
            .filter((id): id is string => Boolean(id)),
        );
        if (shopKind === "canteen" && canteenIds.size > 1) {
          setError(
            "One canteen per order — clear items from the other canteen first.",
          );
          return;
        }
        const canteenId =
          shopKind === "canteen" ? [...canteenIds][0] : undefined;
        const canteenName = canteenId
          ? getRestaurant(canteenId)?.name
          : undefined;

        const orderId = await createOrder({
          sessionId,
          customerId: customer.uid,
          customerName,
          customerEmail: customer.email,
          customerPhone: digits,
          shopKind,
          canteenId,
          canteenName,
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
              shopKind === "canteen" && canteenName
                ? `Pickup: ${canteenName}`
                : "",
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
    [
      clearCart,
      ensureGuestCheckout,
      items,
      router,
      sessionId,
      shopKind,
      user,
    ],
  );

  return { placeOrder, loading, error, setError, shopKind };
}
