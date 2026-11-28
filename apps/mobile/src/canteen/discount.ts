import {
  canteenCollegeForRestaurant,
  computeCollegeDiscount,
  normalizeCollegeId,
  restaurantIdFromOrderItems,
  roundMoney,
} from "@fusion-express/shared/canteen-college";
import type { Order } from "@fusion-express/shared/types";

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
  const channel =
    order.orderChannel ??
    (order.items.some((i) => i.itemId.startsWith("canteen:"))
      ? "canteen"
      : undefined);
  if (channel !== "canteen") return undefined;

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
        foodSubtotal +
          order.deliveryFee +
          (order.tip ?? 0) +
          (order.platformFee ?? 0),
      ),
    };
  }

  const subtotal = roundMoney(foodSubtotal - discountAmount);
  const total = roundMoney(
    subtotal + order.deliveryFee + (order.tip ?? 0) + (order.platformFee ?? 0),
  );
  return {
    discountApplied: true,
    discountAmount,
    runnerCollege: runnerCollege ?? undefined,
    canteenCollege: canteenCollege ?? undefined,
    subtotal,
    total,
  };
}

/** Preview 10% college discount on food when customer's college matches. */
export function previewCollegeDiscount(
  foodSubtotal: number,
  customerCollege: string | null | undefined,
  restaurantId: string | null | undefined,
): { eligible: boolean; discountAmount: number; collegeId: string | null } {
  const canteenCollege = canteenCollegeForRestaurant(restaurantId);
  const { discountApplied, discountAmount } = computeCollegeDiscount(
    foodSubtotal,
    customerCollege,
    canteenCollege,
  );
  return {
    eligible: discountApplied,
    discountAmount,
    collegeId: canteenCollege,
  };
}
