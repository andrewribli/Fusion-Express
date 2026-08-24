export const BASE_DELIVERY_FEE = 10;
export const WEIGHT_INCLUDED_KG = 2;
export const WEIGHT_SURCHARGE_PER_KG = 3;

export type DeliveryZone = 1 | 2 | 3;

export const ZONE_DISTANCE_SURCHARGE: Record<DeliveryZone, number> = {
  1: 0,
  2: 5,
  3: 8,
};

export const ZONE_LABELS: Record<DeliveryZone, string> = {
  1: "Nearby (≤0.5 km from Fusion)",
  2: "Medium (0.5–1.5 km)",
  3: "Far (1.5–3 km)",
};

/** Colleges / residences relative to Fusion at Benjamin Franklin Centre */
const COLLEGE_ZONES: Record<string, DeliveryZone> = {
  "Chung Chi College": 1,
  "United College": 2,
  "Shaw College": 2,
  "New Asia College": 3,
  "International House (I-House)": 3,
  "Postgraduate Halls (PGH)": 3,
};

export function getDeliveryZone(college: string): DeliveryZone {
  return COLLEGE_ZONES[college] ?? 2;
}

export function zoneSurchargeForCollege(college: string): number {
  return ZONE_DISTANCE_SURCHARGE[getDeliveryZone(college)];
}

export interface DeliveryFeeBreakdown {
  baseFee: number;
  weightKg: number;
  extraKg: number;
  weightSurcharge: number;
  zone: DeliveryZone;
  distanceSurcharge: number;
  deliveryFee: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function cartTotalWeightKg(
  items: { item: { weightKg?: number }; quantity: number }[],
): number {
  return round2(
    items.reduce(
      (sum, line) => sum + (line.item.weightKg ?? 0.2) * line.quantity,
      0,
    ),
  );
}

export function calculateDeliveryFee(input: {
  weightKg: number;
  college: string;
}): DeliveryFeeBreakdown {
  const weightKg = Math.max(0, round2(input.weightKg));
  const extraKg = Math.max(0, Math.ceil(weightKg - WEIGHT_INCLUDED_KG));
  const weightSurcharge = extraKg * WEIGHT_SURCHARGE_PER_KG;
  const zone = getDeliveryZone(input.college);
  const distanceSurcharge = ZONE_DISTANCE_SURCHARGE[zone];

  return {
    baseFee: BASE_DELIVERY_FEE,
    weightKg,
    extraKg,
    weightSurcharge,
    zone,
    distanceSurcharge,
    deliveryFee: BASE_DELIVERY_FEE + weightSurcharge + distanceSurcharge,
  };
}
