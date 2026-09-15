"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useUser, getUserAccountId } from "@/context/UserContext";
import { getLobbyForHall } from "@/data/cuhk-locations";
import { getEstimatedDeliveryTime } from "@/lib/constants";
import {
  MAX_ACTIVE_CUSTOMER_ORDERS,
  ACTIVE_ORDER_LIMIT_MESSAGE,
  isActiveCustomerOrderStatus,
} from "@/lib/order-status";
import { calculateDeliveryFee, cartTotalWeightKg } from "@/lib/delivery";
import { createOrder, fetchOrdersByIds, getOrderHistoryIds } from "@/lib/orders";
import { getUnitPrice, lineTotal } from "@/lib/pricing";
import { requestNotificationPermission } from "@/lib/notifications";
import type { PaymentMethod } from "@/lib/payment-method";

export function usePlaceOrder() {
  const router = useRouter();
  const { user } = useUser();
  const { items, subtotal, sessionId, clearCart } = useCart();
  const [loading, setLoading] = useState(false);

  const placeOrder = useCallback(
    async (opts: { college: string; hall: string; paymentMethod: PaymentMethod }) => {
      if (!user || items.length === 0) return;
      setLoading(true);
      try {
        const ids = getOrderHistoryIds();
        const existing = await fetchOrdersByIds(ids);
        const activeCount = existing.filter(
          (order) =>
            order.customerId === getUserAccountId(user) &&
            isActiveCustomerOrderStatus(order.status),
        ).length;
        if (activeCount >= MAX_ACTIVE_CUSTOMER_ORDERS) {
          throw new Error(ACTIVE_ORDER_LIMIT_MESSAGE);
        }

        await requestNotificationPermission();
        const fee = calculateDeliveryFee({
          weightKg: cartTotalWeightKg(items),
          college: opts.college,
        });
        const orderItems = items.map(({ item, quantity }) => ({
          itemId: item.id,
          name: item.name,
          price: getUnitPrice(item),
          quantity,
          weightKg: item.weightKg,
        }));
        const orderSubtotal = items.reduce(
          (sum, c) => sum + lineTotal(c.item, c.quantity),
          0,
        );
        const total = orderSubtotal + fee.deliveryFee;
        const orderId = await createOrder({
          sessionId,
          customerId: getUserAccountId(user),
          customerName: user.fullName,
          items: orderItems,
          status: "pending",
          college: opts.college,
          hall: opts.hall,
          roomNumber: user.roomNumber,
          lobbyPoint: getLobbyForHall(opts.hall),
          zone: fee.zone,
          totalWeight: fee.weightKg,
          customerNote: [
            `Payment: ${opts.paymentMethod}`,
            ...new Set(
              items
                .map(({ item }) => item.itemNote)
                .filter((note): note is string => Boolean(note)),
            ),
          ]
            .filter(Boolean)
            .join("\n") || undefined,
          subtotal: orderSubtotal,
          deliveryFee: fee.deliveryFee,
          total,
          paymentReceived: false,
          estimatedDeliveryAt: getEstimatedDeliveryTime(),
        });
        clearCart();
        router.push(`/track?orderId=${orderId}`);
      } finally {
        setLoading(false);
      }
    },
    [clearCart, items, router, sessionId, user],
  );

  return { placeOrder, loading, subtotal };
}
