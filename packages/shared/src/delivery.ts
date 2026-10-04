import type { CampusId } from "./campus";

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

export const CITYU_ZONE_LABELS: Record<DeliveryZone, string> = {
  1: "Nearby (Kowloon Tong → Festival Walk)",
  2: "Medium",
  3: "Far (Ma On Shan Compound)",
};

/**
 * CUHK college distance surcharge (HK$). Explicit amounts — not derived from
 * the coarse 0/5/8 zone buckets (those remain for CityU + zone labels).
 *
 * Legacy "International House" aliases map to I-House 1/2 (+HK$8).
 */
export const COLLEGE_DISTANCE_SURCHARGE: Record<string, number> = {
  "Chung Chi College": 3,
  "S.H. Ho College (SHHO)": 3,
  "Morningside College": 3,
  "United College": 5,
  "Shaw College": 5,
  "Lee Woo Sing College (LWS)": 7,
  "C.W. Chu College": 8,
  "Wu Yee Sun College (WYS)": 8,
  "New Asia College": 8,
  "I-House 1/2": 8,
  "I-House 3/4/5": 4,
  "International House": 8,
  "International House (I-House)": 8,
  "Postgraduate Halls (PGH)": 8,
  "Campus Facilities": 0,
};

/** Approximate zone bucket for CUHK colleges (labels / legacy breakdown). */
const COLLEGE_ZONES: Record<string, DeliveryZone> = {
  "Chung Chi College": 1,
  "S.H. Ho College (SHHO)": 1,
  "Morningside College": 1,
  "United College": 2,
  "Shaw College": 2,
  "Lee Woo Sing College (LWS)": 2,
  "C.W. Chu College": 3,
  "Wu Yee Sun College (WYS)": 3,
  "New Asia College": 3,
  "I-House 1/2": 3,
  "I-House 3/4/5": 2,
  "International House": 3,
  "International House (I-House)": 3,
  "Postgraduate Halls (PGH)": 3,
  "Campus Facilities": 1,
};

/** CityU compounds relative to Taste at Festival Walk */
const CITYU_COMPOUND_ZONES: Record<string, DeliveryZone> = {
  "Kowloon Tong Compound": 1,
  "Ma On Shan Compound": 3,
};

export function getDeliveryZone(
  college: string,
  campus: CampusId = "cuhk",
): DeliveryZone {
  if (campus === "cityu") {
    return CITYU_COMPOUND_ZONES[college] ?? 2;
  }
  return COLLEGE_ZONES[college] ?? 2;
}

export function zoneSurchargeForCollege(
  college: string,
  campus: CampusId = "cuhk",
): number {
  if (campus === "cityu") {
    return ZONE_DISTANCE_SURCHARGE[getDeliveryZone(college, campus)];
  }
  if (Object.prototype.hasOwnProperty.call(COLLEGE_DISTANCE_SURCHARGE, college)) {
    return COLLEGE_DISTANCE_SURCHARGE[college];
  }
  return ZONE_DISTANCE_SURCHARGE[2];
}

export function zoneLabelsForCampus(
  campus: CampusId,
): Record<DeliveryZone, string> {
  return campus === "cityu" ? CITYU_ZONE_LABELS : ZONE_LABELS;
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
  campus?: CampusId;
}): DeliveryFeeBreakdown {
  const weightKg = Math.max(0, round2(input.weightKg));
  const extraKg = Math.max(0, Math.ceil(weightKg - WEIGHT_INCLUDED_KG));
  const weightSurcharge = extraKg * WEIGHT_SURCHARGE_PER_KG;
  const campus = input.campus ?? "cuhk";
  const zone = getDeliveryZone(input.college, campus);
  const distanceSurcharge = zoneSurchargeForCollege(input.college, campus);

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
