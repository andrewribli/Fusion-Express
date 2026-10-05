import type { CartItem } from "@/lib/types";
import {
  cartTotalWeightKg,
  type DeliveryFeeBreakdown,
} from "@/lib/delivery";
import { isCanteenCart } from "@/lib/canteen/cart";
import type { CampusId } from "@fusion-express/shared/campus";
import {
  computeDeliveryFee,
  resolveOrderSourceId,
  type DeliveryFeeQuote,
} from "@fusion-express/shared/delivery-pricing";

export type ResolvedDeliveryFee = DeliveryFeeBreakdown & {
  quote: DeliveryFeeQuote;
};

/** Grocery and canteen fees both come from computeDeliveryFee. */
export function resolveOrderDeliveryFee(
  items: CartItem[],
  college: string,
  campus: CampusId = "cuhk",
  hall = "",
): ResolvedDeliveryFee {
  const weightKg = cartTotalWeightKg(items);
  const canteen = isCanteenCart(items);
  const sourceId = resolveOrderSourceId({
    campus,
    items: items.map((line) => ({ itemId: line.item.id })),
    orderChannel: canteen ? "canteen" : campus === "cityu" ? "taste" : "fusion",
    sourceId: items.some((line) => line.item.id.startsWith("wellcome:"))
      ? "wellcome"
      : undefined,
  });
  const quote = computeDeliveryFee({
    campus,
    sourceId,
    hallId: hall,
    college,
    weightKg,
  });
  return {
    baseFee: quote.base,
    weightKg: quote.weightKg ?? weightKg,
    extraKg: quote.extraKg ?? 0,
    weightSurcharge: quote.weightSurcharge ?? 0,
    zone: quote.zone ?? 1,
    distanceSurcharge:
      quote.pricing === "cuhk-grocery"
        ? (quote.distanceSurcharge ?? 0)
        : quote.surcharge,
    deliveryFee: quote.total,
    quote,
  };
}
