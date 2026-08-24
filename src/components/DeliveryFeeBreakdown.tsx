import type { DeliveryFeeBreakdown as Breakdown } from "@/lib/delivery";
import { WEIGHT_INCLUDED_KG, WEIGHT_SURCHARGE_PER_KG } from "@/lib/delivery";

export function DeliveryFeeBreakdown({
  breakdown,
}: {
  breakdown: Breakdown;
}) {
  return (
    <div className="space-y-1 text-sm text-gray-600">
      <div className="flex justify-between">
        <span>Base delivery (up to {WEIGHT_INCLUDED_KG} kg)</span>
        <span>${breakdown.baseFee}</span>
      </div>
      <div className="flex justify-between">
        <span>
          Weight {breakdown.weightKg} kg
          {breakdown.extraKg > 0
            ? ` · +${breakdown.extraKg} kg × $${WEIGHT_SURCHARGE_PER_KG}`
            : ""}
        </span>
        <span>${breakdown.weightSurcharge}</span>
      </div>
      <div className="flex justify-between">
        <span>Distance Zone {breakdown.zone}</span>
        <span>${breakdown.distanceSurcharge}</span>
      </div>
      <div className="flex justify-between font-medium text-gray-800">
        <span>Delivery fee</span>
        <span>${breakdown.deliveryFee}</span>
      </div>
    </div>
  );
}
