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

export function usePlaceOrder() {
  const router = useRouter();
  const { user } = useUser();
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
    }) => {
      if (!user) {
        router.push("/login?next=/");
        return;
      }
      if (!opts.college || !opts.hall || items.length === 0) {
        setError("Add items and choose your college and hall first.");
        return;
      }

      setLoading(true);
      setError("");
      await requestNotificationPermission();

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
      const tipAmount = opts.tip ?? 0;
      const total = orderSubtotal + fee.deliveryFee + tipAmount;
      const estimatedDeliveryAt = getEstimatedDeliveryTime();

      try {
        const orderId = await createOrder({
          sessionId,
          customerId: getUserAccountId(user),
          customerName: user.fullName,
          customerEmail: user.email,
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
          customerEmail: user.email,
          orderId,
          items: orderItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          total,
        });

        clearCart();
        router.push(`/track?orderId=${orderId}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not place order. Try again.",
        );
      } finally {
        setLoading(false);
      }
    },
    [clearCart, items, router, sessionId, user],
  );

  return { placeOrder, loading, error, setError };
}
