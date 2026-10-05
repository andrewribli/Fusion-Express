import {
  customerCollegeSavingsView,
  settleCollegeDiscountOnAccept,
  type StoredCollegeOrder,
} from "@fusion-express/shared/college-discount";
import { resolveOrderChannel } from "@/components/OrderChannelBadge";
import type { Order } from "@/lib/types";

/**
 * Preview of the server settlement. The accept API ignores this and
 * recalculates from the order document plus the runner's locked college.
 */
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
  if (order.campus === "cityu") return undefined;
  const stored: StoredCollegeOrder = {
    campus: order.campus,
    orderChannel: order.orderChannel,
    canteenRestaurantId: order.canteenRestaurantId,
    discountCollege: order.discountCollege,
    discountAmount: order.discountAmount,
    discountSplit: order.discountSplit,
    discountApplied: order.discountApplied,
    platformDiscountFee: order.platformDiscountFee,
    collegeDiscountStatus: order.collegeDiscountStatus,
    subtotal: order.subtotal,
    estimatedSubtotal: order.estimatedSubtotal,
    deliveryFee: order.deliveryFee,
    tip: order.tip,
    platformFee: order.platformFee,
    total: order.total,
    status: order.status,
  };
  const settled = settleCollegeDiscountOnAccept(stored, runnerCollegeRaw);
  if (!settled.eligible) return undefined;
  const view = customerCollegeSavingsView({
    ...stored,
    discountApplied: settled.discountApplied,
    collegeDiscountStatus: settled.collegeDiscountStatus,
    subtotal: settled.subtotal,
    total: settled.total,
  });
  return {
    discountApplied: settled.discountApplied,
    discountAmount: view.amount,
    runnerCollege: settled.runnerCollege ?? undefined,
    canteenCollege: order.canteenCollege,
    subtotal: settled.subtotal,
    total: settled.total,
  };
}
