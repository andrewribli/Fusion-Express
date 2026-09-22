"use client";

import { getCollege } from "@/data/canteen/colleges";
import { getRestaurant } from "@/data/canteen/restaurants";

export function CollegeDiscountBanner({
  restaurantId,
}: {
  restaurantId: string;
}) {
  const restaurant = getRestaurant(restaurantId);
  if (!restaurant?.collegeId) return null;
  const college = getCollege(restaurant.collegeId);
  if (!college) return null;

  return (
    <div className="rounded-xl border border-[#ED1C24]/25 bg-[#ED1C24]/5 px-4 py-3">
      <p className="text-sm font-semibold text-gray-900">
        {college.shortName} college student discount
      </p>
      <p className="mt-1 text-xs leading-relaxed text-gray-600">
        Order from {restaurant.shortName} and get{" "}
        <span className="font-semibold text-[#ED1C24]">10% off</span> your
        canteen food if your runner is from {college.shortName} (
        {college.fullName}). Delivery fee is not discounted.
      </p>
    </div>
  );
}
