import { CITYU_COMPOUND_NAMES } from "@/ptero/config/locations";

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
  1: "Nearby (Kowloon Tong → Festival Walk)",
  2: "Medium",
  3: "Far (Ma On Shan Compound)",
};

/** Taste at Festival Walk is next to Kowloon Tong; Ma On Shan is a longer run. */
const COMPOUND_ZONES: Record<string, DeliveryZone> = {
  "Kowloon Tong Compound": 1,
  "Ma On Shan Compound": 3,
};

export function getDeliveryZone(compound: string): DeliveryZone {
  return COMPOUND_ZONES[compound] ?? 2;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function cartTotalWeightKg(
  items: { item: { weightKg?: number }; quantity: number }[],
): number {
  return round2(
    items.reduce((sum, c) => sum + (c.item.weightKg ?? 0.2) * c.quantity, 0),
  );
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

export function calculateDeliveryFee(opts: {
  weightKg: number;
  compound: string;
}): DeliveryFeeBreakdown {
  const extraKg = Math.max(0, Math.ceil(opts.weightKg - WEIGHT_INCLUDED_KG));
  const weightSurcharge = extraKg * WEIGHT_SURCHARGE_PER_KG;
  const zone = getDeliveryZone(opts.compound);
  const distanceSurcharge = ZONE_DISTANCE_SURCHARGE[zone];
  return {
    baseFee: BASE_DELIVERY_FEE,
    weightKg: opts.weightKg,
    extraKg,
    weightSurcharge,
    zone,
    distanceSurcharge,
    deliveryFee: BASE_DELIVERY_FEE + weightSurcharge + distanceSurcharge,
  };
}

export const KNOWN_COMPOUNDS = CITYU_COMPOUND_NAMES;
