"use client";

import {
  collegesMatch,
  matchingRunnerBanner,
  nonMatchingRunnerNote,
  normalizeRunnerCollegeId,
  orderMatchesRunnerCollege,
} from "@fusion-express/shared/college-discount";
import { restaurantIdFromOrderItems } from "@/data/canteen/colleges";
import { resolveOrderChannel } from "@/components/OrderChannelBadge";
import type { Order } from "@/lib/types";

/**
 * Matching runners see the student-card bonus. Other runners still see the
 * order, with a short note that their college does not get the discount.
 */
export function CollegeDiscountRunnerBadge({
  order,
  runnerCollege,
}: {
  order: Order;
  runnerCollege?: string | null;
}) {
  if (resolveOrderChannel(order) !== "canteen") return null;
  if (order.campus === "cityu") return null;
  if (!orderMatchesRunnerCollege(order, order.discountCollege)) return null;

  const restaurantId =
    order.canteenRestaurantId || restaurantIdFromOrderItems(order.items);
  const runner = normalizeRunnerCollegeId(runnerCollege);
  const matching = collegesMatch(order.discountCollege, runner);

  if (matching) {
    return (
      <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-emerald-50 px-3 py-2.5 text-sm text-amber-950">
        <p className="font-semibold">{matchingRunnerBanner(order.discountCollege)}</p>
      </div>
    );
  }

  return (
    <p className="text-xs text-gray-500">{nonMatchingRunnerNote(restaurantId)}</p>
  );
}
