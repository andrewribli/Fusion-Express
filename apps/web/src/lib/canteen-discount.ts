import {
  canteenCollegeForRestaurant,
  computeCollegeDiscount,
  normalizeCollegeId,
  restaurantIdFromOrderItems,
  roundMoney,
} from "@/data/canteen/colleges";
import { resolveOrderChannel } from "@/components/OrderChannelBadge";
import type { Order } from "@/lib/types";

/** Build discount fields to persist when a runner accepts a canteen order. */
export function buildAcceptDiscount(
  order: Order,
  runnerCollegeRaw: string | null | undefined,
):
  | {
      discountApplied: boolean;
      discountAmount: number;
      runnerCollege?: string;
      canteenCollege?: string;
      subtotal: number;
      total: number;
    }
  | undefined {
  if (resolveOrderChannel(order) !== "canteen") return undefined;

  const restaurantId =
    order.canteenRestaurantId || restaurantIdFromOrderItems(order.items);
  const canteenCollege =
    normalizeCollegeId(order.canteenCollege) ||
    canteenCollegeForRestaurant(restaurantId);
  const runnerCollege = normalizeCollegeId(runnerCollegeRaw);

  const foodSubtotal =
    order.estimatedSubtotal != null && order.estimatedSubtotal > 0
      ? order.estimatedSubtotal
      : order.subtotal + (order.discountAmount ?? 0);

  const { discountApplied, discountAmount } = computeCollegeDiscount(
    foodSubtotal,
    runnerCollege,
    canteenCollege,
  );

  if (!discountApplied) {
    return {
      discountApplied: false,
      discountAmount: 0,
      runnerCollege: runnerCollege ?? undefined,
      canteenCollege: canteenCollege ?? undefined,
      subtotal: roundMoney(foodSubtotal),
      total: roundMoney(
        foodSubtotal + order.deliveryFee + (order.tip ?? 0),
      ),
    };
  }

  const subtotal = roundMoney(foodSubtotal - discountAmount);
  const total = roundMoney(subtotal + order.deliveryFee + (order.tip ?? 0));
  return {
    discountApplied: true,
    discountAmount,
    runnerCollege: runnerCollege ?? undefined,
    canteenCollege: canteenCollege ?? undefined,
    subtotal,
    total,
  };
}
