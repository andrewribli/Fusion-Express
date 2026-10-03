import { calculateDeliveryFee, cartTotalWeightKg } from "@/lib/delivery";
import type { CartItem } from "@/lib/types";

export const SMALL_ORDER_THRESHOLD = 80;
export const SMALL_ORDER_FEE = 19;
export const PACKAGING_FEE = 1;
export const PLATFORM_FEE = 2;

export type FulfillmentMode = "delivery" | "pickup";

export function computeCartFees(input: {
  items: CartItem[];
  subtotal: number;
  college?: string;
  fulfillment: FulfillmentMode;
  discount?: number;
}) {
  const weightKg = cartTotalWeightKg(input.items);
  const delivery = calculateDeliveryFee({
    weightKg,
    college: input.college ?? "",
  });
  const deliveryFee =
    input.fulfillment === "pickup" ? 0 : delivery.deliveryFee;
  const smallOrderFee =
    input.subtotal > 0 && input.subtotal < SMALL_ORDER_THRESHOLD
      ? SMALL_ORDER_FEE
      : 0;
  const packagingFee = input.items.length > 0 ? PACKAGING_FEE : 0;
  const platformFee = input.items.length > 0 ? PLATFORM_FEE : 0;
  const discount = Math.max(0, input.discount ?? 0);
  const total = Math.max(
    0,
    Math.round(
      (input.subtotal +
        deliveryFee +
        smallOrderFee +
        packagingFee +
        platformFee -
        discount) *
        100,
    ) / 100,
  );

  return {
    weightKg,
    delivery,
    deliveryFee,
    smallOrderFee,
    packagingFee,
    platformFee,
    discount,
    total,
    smallOrderProgress: Math.min(1, input.subtotal / SMALL_ORDER_THRESHOLD),
    smallOrderRemaining: Math.max(0, SMALL_ORDER_THRESHOLD - input.subtotal),
  };
}
