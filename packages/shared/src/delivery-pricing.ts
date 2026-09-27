import type { CampusId } from "./campus";
import {
  BASE_DELIVERY_FEE,
  calculateDeliveryFee,
  type DeliveryZone,
} from "./delivery";
import { findHall, isCityuHall12 } from "./halls";
import { CUHK_COLLEGE_HALLS, type CuhkCollege } from "./locations";

/**
 * Delivery pricing for GraceRun.
 *
 * CityU numbers are Andrew's confirmed schedule (base + hall surcharge, once).
 * CUHK Fusion grocery and CUHK canteens stay on the fee the app already charges.
 * Hall 12 has no CityU tier — those orders keep today's CityU checkout fee.
 */

export const CITYU_TASTE_BASE = 15;
export const CITYU_WELLCOME_BASE = 20;
export const CITYU_CANTEEN_BASE = 7.5;

/**
 * Fee CityU checkout charges today (Taste, Wellcome, and canteen were all a
 * flat HK$10, which is the same figure as the shared base). Used only when a
 * CityU hall tier does not apply — Hall 12, and CityU canteens other than
 * AC1 and Ebeneezer's.
 */
export const CITYU_LEGACY_FLAT_FEE = BASE_DELIVERY_FEE;

export type DeliveryPricingKind =
  | "cityu-tier"
  | "cityu-hall12-legacy"
  | "cityu-legacy-source"
  | "cuhk-flat"
  | "cuhk-grocery";

export interface DeliveryFeeQuote {
  base: number;
  surcharge: number;
  total: number;
  hallName?: string;
  pricing: DeliveryPricingKind;
  /** CUHK Fusion grocery only — the existing zone + weight pieces. */
  zone?: DeliveryZone;
  weightKg?: number;
  extraKg?: number;
  weightSurcharge?: number;
  distanceSurcharge?: number;
}

export interface ComputeDeliveryFeeInput {
  campus: CampusId | string;
  sourceId: string;
  hallId?: string | null;
  /**
   * CUHK Fusion grocery only. Preserves today's weight surcharge.
   * CityU ignores this.
   */
  weightKg?: number;
  /**
   * CUHK Fusion grocery fallback when the hall is not chosen yet.
   * Matches calculateDeliveryFee's college zones. Not a CityU hall tier.
   */
  college?: string | null;
}

const CITYU_LEGACY_CANTEENS = new Set([
  "ac2-canteen",
  "ac3-bistro",
  "hall-canteen-klnt",
  "hall-canteen-mos",
  "city-chinese",
]);

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatHkdAmount(amount: number): string {
  const rounded = round2(amount);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/** Normalize aliases. Campus decides CUHK Ebeneezer's vs CityU Ebeneezer's. */
export function normalizeDeliverySourceId(
  campus: CampusId | string,
  sourceId: string,
): string {
  const id = sourceId.trim().toLowerCase();
  if (campus === "cityu") {
    if (id === "ac1" || id === "city-express" || id === "city-express-ac1") {
      return "ac1";
    }
    if (
      id === "eben" ||
      id === "ebeneezers" ||
      id === "ebeneezers-5380" ||
      id === "ebeneezer" ||
      id === "ebeneezers-kebabs"
    ) {
      return "eben";
    }
    if (id === "taste" || id === "wellcome" || id === "fusion") return id === "fusion" ? "taste" : id;
    return id;
  }
  if (id === "fusion" || id === "grocery" || id === "cuhk" || id === "taste") {
    return "fusion";
  }
  return id;
}

function cityuTieredBase(sourceId: string): number | null {
  if (sourceId === "taste") return CITYU_TASTE_BASE;
  if (sourceId === "wellcome") return CITYU_WELLCOME_BASE;
  if (sourceId === "ac1" || sourceId === "eben") return CITYU_CANTEEN_BASE;
  return null;
}

function collegeForCuhkHall(hallId: string | null | undefined): string | undefined {
  const name = findHall(hallId, "cuhk")?.name ?? hallId?.trim();
  if (!name) return undefined;
  if (name in CUHK_COLLEGE_HALLS) return name;
  for (const [college, halls] of Object.entries(CUHK_COLLEGE_HALLS)) {
    if ((halls as readonly string[]).includes(name)) return college;
  }
  return undefined;
}

function cuhkGroceryQuote(input: ComputeDeliveryFeeInput): DeliveryFeeQuote {
  const fromHall = collegeForCuhkHall(input.hallId);
  const college =
    fromHall ??
    (input.college && input.college in CUHK_COLLEGE_HALLS
      ? input.college
      : input.college?.trim() || "");
  const breakdown = calculateDeliveryFee({
    weightKg: Math.max(0, input.weightKg ?? 0),
    college,
    campus: "cuhk",
  });
  const surcharge = round2(
    breakdown.weightSurcharge + breakdown.distanceSurcharge,
  );
  return {
    base: breakdown.baseFee,
    surcharge,
    total: breakdown.deliveryFee,
    hallName: findHall(input.hallId, "cuhk")?.name,
    pricing: "cuhk-grocery",
    zone: breakdown.zone,
    weightKg: breakdown.weightKg,
    extraKg: breakdown.extraKg,
    weightSurcharge: breakdown.weightSurcharge,
    distanceSurcharge: breakdown.distanceSurcharge,
  };
}

function cuhkFlatQuote(hallId: string | null | undefined): DeliveryFeeQuote {
  return {
    base: BASE_DELIVERY_FEE,
    surcharge: 0,
    total: BASE_DELIVERY_FEE,
    hallName: findHall(hallId, "cuhk")?.name,
    pricing: "cuhk-flat",
    zone: 1,
    weightKg: 0,
    extraKg: 0,
    weightSurcharge: 0,
    distanceSurcharge: 0,
  };
}

function cityuLegacyQuote(
  kind: "cityu-hall12-legacy" | "cityu-legacy-source",
  hallName?: string,
): DeliveryFeeQuote {
  return {
    base: CITYU_LEGACY_FLAT_FEE,
    surcharge: 0,
    total: CITYU_LEGACY_FLAT_FEE,
    hallName,
    pricing: kind,
  };
}

/**
 * Single delivery quote for both apps.
 * `total` is always `base + surcharge` (the surcharge is applied once).
 */
export function computeDeliveryFee(
  input: ComputeDeliveryFeeInput,
): DeliveryFeeQuote {
  const campus: CampusId = input.campus === "cityu" ? "cityu" : "cuhk";
  const sourceId = normalizeDeliverySourceId(campus, input.sourceId || "");

  if (campus === "cuhk") {
    if (sourceId === "fusion") return cuhkGroceryQuote(input);
    return cuhkFlatQuote(input.hallId);
  }

  const hall = findHall(input.hallId, "cityu");
  if (isCityuHall12(input.hallId)) {
    return cityuLegacyQuote("cityu-hall12-legacy", hall?.name ?? "Hall 12");
  }

  const tierBase = cityuTieredBase(sourceId);
  if (tierBase == null) {
    return cityuLegacyQuote(
      "cityu-legacy-source",
      hall?.name,
    );
  }

  if (!input.hallId?.trim()) {
    return {
      base: tierBase,
      surcharge: 0,
      total: tierBase,
      pricing: "cityu-tier",
    };
  }

  const surcharge = hall?.surcharge;
  if (surcharge == null) {
    return {
      base: tierBase,
      surcharge: 0,
      total: tierBase,
      hallName: hall?.name,
      pricing: "cityu-tier",
    };
  }

  return {
    base: tierBase,
    surcharge,
    total: round2(tierBase + surcharge),
    hallName: hall?.name,
    pricing: "cityu-tier",
  };
}

/** Cart and checkout line. Hall label is included once a CityU hall is known. */
export function formatDeliveryQuote(quote: DeliveryFeeQuote): string {
  const base = formatHkdAmount(quote.base);
  const total = formatHkdAmount(quote.total);
  if (quote.pricing === "cityu-hall12-legacy") {
    return `Delivery: HK$${total}`;
  }
  if (quote.pricing === "cuhk-grocery" || quote.pricing === "cuhk-flat") {
    if (!quote.surcharge) return `Delivery: HK$${base}`;
    return `Delivery: HK$${base} base + HK$${formatHkdAmount(quote.surcharge)} = HK$${total}`;
  }
  if (!quote.hallName) return `Delivery: HK$${base} base`;
  return `Delivery: HK$${base} base + HK$${formatHkdAmount(quote.surcharge)} (${quote.hallName}) = HK$${total}`;
}

/**
 * Order detail. Uses the fee locked on the order.
 * Orders placed before this field existed show their stored deliveryFee only.
 */
export function formatStoredDeliveryFee(order: {
  deliveryFee: number;
  deliveryBase?: number;
  deliverySurcharge?: number;
  deliveryTotal?: number;
  hall?: string;
}): string {
  if (
    order.deliveryBase == null ||
    order.deliverySurcharge == null ||
    order.deliveryTotal == null ||
    !Number.isFinite(order.deliveryBase) ||
    !Number.isFinite(order.deliverySurcharge) ||
    !Number.isFinite(order.deliveryTotal)
  ) {
    return `HK$${formatHkdAmount(order.deliveryFee)}`;
  }
  const base = formatHkdAmount(order.deliveryBase);
  const surcharge = formatHkdAmount(order.deliverySurcharge);
  const total = formatHkdAmount(order.deliveryTotal);
  const hall = order.hall?.trim();
  if (!hall) return `Delivery: HK$${base} base + HK$${surcharge} = HK$${total}`;
  return `Delivery: HK$${base} base + HK$${surcharge} (${hall}) = HK$${total}`;
}

const CANTEEN_PREFIX = "canteen:";

export function restaurantIdFromItemId(itemId: string): string | null {
  if (!itemId.startsWith(CANTEEN_PREFIX)) return null;
  const rest = itemId.slice(CANTEEN_PREFIX.length);
  const idx = rest.indexOf(":");
  if (idx <= 0) return null;
  return rest.slice(0, idx);
}

export function itemsWeightKg(
  items: { weightKg?: number; quantity: number }[],
): number {
  return round2(
    items.reduce(
      (sum, line) => sum + (line.weightKg ?? 0.2) * line.quantity,
      0,
    ),
  );
}

/**
 * Source used to price the order. Item ids win over a client-sent sourceId
 * so a Wellcome cart cannot be priced as Taste.
 */
export function resolveOrderSourceId(input: {
  campus?: string | null;
  sourceId?: string | null;
  canteenRestaurantId?: string | null;
  orderChannel?: string | null;
  items?: { itemId?: string | null }[] | null;
}): string {
  const campus: CampusId = input.campus === "cityu" ? "cityu" : "cuhk";
  const itemIds = (input.items ?? [])
    .map((item) => String(item.itemId ?? ""))
    .filter(Boolean);
  const canteenIds = [
    ...new Set(
      itemIds
        .map(restaurantIdFromItemId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (canteenIds.length === 1) return canteenIds[0]!;
  if (itemIds.some((id) => id.startsWith("wellcome:"))) return "wellcome";
  if (input.canteenRestaurantId?.trim()) return input.canteenRestaurantId.trim();
  if (campus === "cityu") {
    const hinted = normalizeDeliverySourceId(campus, input.sourceId ?? "");
    if (hinted === "wellcome" || hinted === "taste" || hinted === "ac1" || hinted === "eben") {
      return hinted;
    }
    if (CITYU_LEGACY_CANTEENS.has(hinted)) return hinted;
    if (input.orderChannel === "canteen") return "ac1";
    return "taste";
  }
  const hinted = normalizeDeliverySourceId("cuhk", input.sourceId ?? "");
  if (hinted && hinted !== "fusion" && input.orderChannel === "canteen") return hinted;
  return "fusion";
}

export function lockedDeliveryPricing(input: {
  campus?: string | null;
  sourceId?: string | null;
  hallId?: string | null;
  college?: string | null;
  items: { itemId?: string | null; weightKg?: number; quantity: number }[];
  subtotal: number;
  tip?: number;
  canteenRestaurantId?: string | null;
  orderChannel?: string | null;
  weightKg?: number;
}): {
  sourceId: string;
  quote: DeliveryFeeQuote;
  deliveryBase: number;
  deliverySurcharge: number;
  deliveryTotal: number;
  deliveryFee: number;
  total: number;
  zone?: DeliveryZone;
  totalWeight: number;
} {
  const sourceId = resolveOrderSourceId(input);
  const campus: CampusId = input.campus === "cityu" ? "cityu" : "cuhk";
  const totalWeight =
    input.weightKg != null && Number.isFinite(input.weightKg)
      ? round2(Math.max(0, input.weightKg))
      : itemsWeightKg(
          input.items.map((item) => ({
            weightKg: item.weightKg,
            quantity: item.quantity,
          })),
        );
  const quote = computeDeliveryFee({
    campus,
    sourceId,
    hallId: input.hallId,
    college: input.college,
    weightKg: totalWeight,
  });
  const tip = Math.max(0, input.tip ?? 0);
  return {
    sourceId: normalizeDeliverySourceId(campus, sourceId),
    quote,
    deliveryBase: quote.base,
    deliverySurcharge: quote.surcharge,
    deliveryTotal: quote.total,
    deliveryFee: quote.total,
    total: round2(input.subtotal + quote.total + tip),
    zone: quote.zone,
    totalWeight,
  };
}

export function isKnownCuhkCollege(value: string): value is CuhkCollege {
  return value in CUHK_COLLEGE_HALLS;
}
