"use client";

import {
  canteenDiscountConfig,
  runnerCollegeLabel,
} from "@fusion-express/shared/college-discount";
import { getRestaurant } from "@/data/canteen/restaurants";

export function CollegeDiscountBanner({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const config = canteenDiscountConfig(restaurantId);
  if (!config.discountSplit || !config.discountCollege) return null;
  const restaurant = getRestaurant(restaurantId);
  const college = runnerCollegeLabel(config.discountCollege);

  return (
    <div className="rounded-xl border border-[#ED1C24]/25 bg-[#ED1C24]/5 px-4 py-3">
      <p className="text-sm font-semibold text-gray-900">
        College discount applied — you save HK${config.discountSplit.customer}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-gray-600">
        Order from {restaurant?.shortName ?? "this canteen"} and save HK$
        {config.discountSplit.customer} when a {college} runner accepts with
        their student card. A runner from another college removes the discount.
        Delivery fee is not discounted.
      </p>
    </div>
  );
}
