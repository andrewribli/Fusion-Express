import type { CampusId } from "./campus";

/** Halved vs original $10 / $3/kg / zone $0–$5–$8 — rounded to whole HKD. */
export const BASE_DELIVERY_FEE = 5;
export const WEIGHT_INCLUDED_KG = 2;
export const WEIGHT_SURCHARGE_PER_KG = 2;

/** Flat GraceRun platform fee on every order (HK$). Runner does not receive this. */
export const PLATFORM_FEE_HKD = 2;

/** Runner may add this when the bag is over 5 kg. */
export const HEAVY_BAG_THRESHOLD_KG = 5;
export const HEAVY_BAG_SURCHARGE = 5;

export type DeliveryZone = 1 | 2 | 3;

export const ZONE_DISTANCE_SURCHARGE: Record<DeliveryZone, number> = {
  1: 0,
  2: 3,
  3: 4,
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

/** Colleges / residences relative to Fusion at Benjamin Franklin Centre */
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
  return ZONE_DISTANCE_SURCHARGE[getDeliveryZone(college, campus)];
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
  heavyBagEligible: boolean;
}

function roundInt(n: number): number {
  return Math.round(n);
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
  const weightSurcharge = roundInt(extraKg * WEIGHT_SURCHARGE_PER_KG);
  const campus = input.campus ?? "cuhk";
  const zone = getDeliveryZone(input.college, campus);
  const distanceSurcharge = ZONE_DISTANCE_SURCHARGE[zone];
  const deliveryFee = roundInt(
    BASE_DELIVERY_FEE + weightSurcharge + distanceSurcharge,
  );

  return {
    baseFee: BASE_DELIVERY_FEE,
    weightKg,
    extraKg,
    weightSurcharge,
    zone,
    distanceSurcharge,
    deliveryFee,
    heavyBagEligible: weightKg > HEAVY_BAG_THRESHOLD_KG,
  };
}

/** Delivery fee the customer pays (zone/weight + optional heavy bag). */
export function orderDeliveryCharge(order: {
  deliveryFee: number;
  heavyBagSurcharge?: number;
}): number {
  return roundInt(
    Number(order.deliveryFee ?? 0) + Number(order.heavyBagSurcharge ?? 0),
  );
}

/**
 * Platform fee stored on the order. Legacy docs without the field stay at $0
 * so we do not retroactively charge completed tickets.
 */
export function orderPlatformFee(order: {
  platformFee?: number;
} | null | undefined): number {
  if (order?.platformFee == null) return 0;
  return Math.max(0, Number(order.platformFee) || 0);
}
