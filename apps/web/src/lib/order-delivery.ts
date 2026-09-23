import type { CartItem } from "@/lib/types";
import {
  calculateDeliveryFee,
  cartTotalWeightKg,
  type DeliveryFeeBreakdown,
} from "@/lib/delivery";
import { CANTEEN_DELIVERY_FEE } from "@/data/canteen/restaurants";
import { isCanteenCart } from "@/lib/canteen/cart";
import type { CampusId } from "@fusion-express/shared/campus";

/** Grocery uses zone/weight fees; canteen is always flat HK$10. */
export function resolveOrderDeliveryFee(
  items: CartItem[],
  college: string,
  campus: CampusId = "cuhk",
): DeliveryFeeBreakdown {
  const weightKg = cartTotalWeightKg(items);
  if (isCanteenCart(items)) {
    return {
      baseFee: CANTEEN_DELIVERY_FEE,
      weightKg,
      extraKg: 0,
      weightSurcharge: 0,
      zone: 1,
      distanceSurcharge: 0,
      deliveryFee: CANTEEN_DELIVERY_FEE,
    };
  }
  return calculateDeliveryFee({ weightKg, college, campus });
}
