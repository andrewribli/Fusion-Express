"use client";

import { getCollege, type CollegeId } from "@/ptero/config/canteen/colleges";
import { formatHkd } from "@/ptero/lib/types";

export function CollegeDiscountBanner({ collegeId }: { collegeId: CollegeId | null }) {
  const college = collegeId ? getCollege(collegeId) : undefined;
  if (!college) return null;
  return (
    <div className="rounded-2xl border border-[#ED1C24]/20 bg-red-50 px-4 py-3 text-sm text-gray-800">
      <p className="font-semibold text-[#ED1C24]">
        {college.shortName} residence student discount
      </p>
      <p className="mt-1 text-xs leading-relaxed text-gray-600">
        When a runner from {college.fullName} accepts, you get{" "}
        <span className="font-semibold text-[#ED1C24]">10% off</span> food.
        Delivery fee is not discounted.
      </p>
    </div>
  );
}

export function DiscountLine({
  discountApplied,
  discountAmount,
}: {
  discountApplied?: boolean;
  discountAmount?: number;
}) {
  if (!discountApplied || !discountAmount || discountAmount <= 0) return null;
  return (
    <div className="flex justify-between text-sm font-semibold text-emerald-700">
      <span>College discount (10%)</span>
      <span>−{formatHkd(discountAmount)}</span>
    </div>
  );
}

export function DiscountReceivedBanner({
  discountApplied,
  runnerCollege,
}: {
  discountApplied?: boolean;
  runnerCollege?: string | null;
}) {
  if (!discountApplied || !runnerCollege) return null;
  const name = getCollege(runnerCollege)?.fullName ?? runnerCollege;
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-emerald-50 px-4 py-3 text-sm text-gray-800">
      <p className="font-bold text-amber-800">Discount received!</p>
      <p className="mt-1 text-xs text-gray-700">
        Your runner is from {name}! You got a 10% discount on your canteen food.
      </p>
    </div>
  );
}
