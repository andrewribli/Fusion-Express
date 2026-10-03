"use client";

import { getCollege, collegeLabel } from "@/ptero/config/canteen/colleges";
import { getRestaurant } from "@/ptero/config/canteen/restaurants";
import type { Order } from "@/ptero/lib/types";
import { resolveOrderChannel } from "@/ptero/lib/types";

/**
 * Shown when a matching-residence runner views/accepts a canteen order.
 */
export function CollegeDiscountRunnerBadge({
  order,
  runnerCollege,
}: {
  order: Order;
  runnerCollege?: string | null;
}) {
  if (resolveOrderChannel(order) !== "canteen") return null;

  const canteenCollege = order.canteenCollege ?? null;
  if (!canteenCollege || !runnerCollege || runnerCollege !== canteenCollege) {
    return null;
  }

  const college = getCollege(canteenCollege);
  const short = college?.shortName ?? canteenCollege;
  const canteenName =
    getRestaurant(order.canteenRestaurantId ?? "")?.shortName ?? "this canteen";

  return (
    <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-emerald-50 px-3 py-2.5 text-sm text-amber-950">
      <p className="font-semibold">
        You&apos;re a {short} runner. Pick up from {canteenName} to give the
        customer a 10% discount.
      </p>
      <p className="mt-0.5 text-xs text-amber-800/80">
        {collegeLabel(canteenCollege)} · food only (delivery fee unchanged)
      </p>
    </div>
  );
}
