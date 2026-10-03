"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import {
  formatDeliveryAddress,
  getLobbyForHall,
} from "@/data/cuhk-locations";
import {
  isOverOrderLimit,
  ORDER_LIMIT_MESSAGE,
  resolveSpecialInstructions,
} from "@/lib/constants";
import { friendlyPlaceOrderError } from "@/lib/auth-errors";
import { notifyOrderPlaced } from "@/lib/notify-email";
import {
  canteenCollegeForRestaurant,
  restaurantIdFromOrderItems,
} from "@/data/canteen/colleges";
import { isCanteenCart } from "@/lib/canteen/cart";
import { cartCampusError } from "@/lib/cart-campus";
import { requestNotificationPermission } from "@/lib/notifications";
import { createOrderOnServer } from "@/lib/create-order-server";
import { getAuthClient } from "@/lib/firebase";
import { getUnitPrice, lineTotal } from "@/lib/pricing";
import type { CampusId } from "@fusion-express/shared/campus";
import {
  parseCanteenItemId,
  type ShopKind,
} from "@fusion-express/shared/shop-kind";
import { getRestaurant } from "@fusion-express/shared/canteen";

export function usePlaceOrder(forcedShopKind?: ShopKind) {
  const router = useRouter();
  const { user, ensureGuestCheckout } = useUser();
  const { items, sessionId, clearCart, shopKind: cartShopKind } = useCart();
  const shopKind = forcedShopKind ?? cartShopKind;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const placeOrder = useCallback(
    async (opts: {
      campus: CampusId;
      college: string;
      hall: string;
      customerNote?: string;
      tip?: number;
      scheduledFor?: string;
    }) => {
      if (!opts.campus || !opts.college || !opts.hall || items.length === 0) {
        setError("Add items and choose your campus and dorm first.");
        return;
      }
      const campusError = cartCampusError(items, opts.campus);
      if (campusError) {
        setError(campusError);
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
          campus: opts.campus,
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
        const tipAmount = Math.max(0, opts.tip ?? 0);
        const lobbyPoint = getLobbyForHall(opts.hall, opts.campus);
        const customerName = customer.fullName.trim();
        const canteen = isCanteenCart(items);
        const restaurantId = canteen
          ? restaurantIdFromOrderItems(
              orderItems.map((item) => ({ itemId: item.itemId })),
            )
          : null;
        const canteenCollege = canteen
          ? canteenCollegeForRestaurant(restaurantId) ?? undefined
          : undefined;
        const orderChannel = canteen
          ? ("canteen" as const)
          : opts.campus === "cityu"
            ? ("taste" as const)
            : ("fusion" as const);

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
          shopKind === "canteen"
            ? [...canteenIds][0] ?? restaurantId ?? undefined
            : undefined;
        const canteenName = canteenId
          ? getRestaurant(canteenId)?.name
          : undefined;

        if (canteen && restaurantId) {
          const token = await getAuthClient().currentUser?.getIdToken();
          const validation = await fetch("/api/canteen/validate-order", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              canteenId: restaurantId,
              itemIds: orderItems.map((item) => item.itemId),
              scheduledFor: opts.scheduledFor,
            }),
          });
          if (!validation.ok) {
            let message = "This canteen is not accepting orders right now.";
            try {
              const data = (await validation.json()) as { error?: string };
              if (data.error) message = data.error;
            } catch {
              // ignore
            }
            setError(message);
            return;
          }
        }

        const placed = await createOrderOnServer({
          sessionId,
          customerName,
          customerEmail: customer.email,
          campus: opts.campus,
          sourceId: canteen && restaurantId ? restaurantId : "fusion",
          hallId: opts.hall,
          orderChannel,
          canteenRestaurantId: restaurantId ?? undefined,
          canteenCollege,
          shopKind,
          canteenId,
          canteenName,
          items: orderItems,
          college: opts.college,
          hall: opts.hall,
          lobbyPoint,
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
          tip: tipAmount || undefined,
          scheduledFor: opts.scheduledFor,
        });
        const orderId = placed.id;
        const total = placed.total;

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
