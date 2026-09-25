import { hktParts } from "@/data/canteen/canteen-config";

export {
  CANONICAL_GROCERY_CATEGORIES,
  canonicalGroceryCategory,
  type CanonicalGroceryCategory,
} from "@/lib/groceryCategories";

/** CityU grocery stores. Last explicit pick is stored, never chosen for you. */
export const GROCERY_SOURCE_STORAGE_KEY = "gracerun_cityu_grocery_source";

export type GrocerySourceId = "taste" | "wellcome";

export interface GrocerySource {
  id: GrocerySourceId;
  name: string;
  campus: "cityu";
  tier: "premium" | "value";
  walkMinutes: number;
  deliveryFee: number;
  /** Where the runner collects the bag. */
  pickup: string;
  status: "open";
  /**
   * Daily window in Asia/Hong_Kong.
   * Taste Festival Walk: 08:00–22:00 (Festival Walk supermarket).
   * Wellcome Nam Shan Shopping Centre: 08:00–22:30 (estate shop window).
   */
  hours: { open: string; close: string };
}

export const GROCERY_SOURCES: Record<GrocerySourceId, GrocerySource> = {
  taste: {
    id: "taste",
    name: "Taste @ Festival Walk",
    campus: "cityu",
    tier: "premium",
    walkMinutes: 13,
    deliveryFee: 10,
    pickup: "Taste, Festival Walk",
    status: "open",
    hours: { open: "08:00", close: "22:00" },
  },
  wellcome: {
    id: "wellcome",
    name: "Wellcome @ Nam Shan Estate",
    campus: "cityu",
    tier: "value",
    walkMinutes: 13,
    deliveryFee: 10,
    pickup: "Wellcome, Nam Shan Estate",
    status: "open",
    hours: { open: "08:00", close: "22:30" },
  },
};

export const GROCERY_SOURCE_LIST: GrocerySource[] = [
  GROCERY_SOURCES.taste,
  GROCERY_SOURCES.wellcome,
];

export function isGrocerySourceId(value: string | null | undefined): value is GrocerySourceId {
  return value === "taste" || value === "wellcome";
}

export function grocerySourceById(id: GrocerySourceId): GrocerySource {
  return GROCERY_SOURCES[id];
}

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Same Hong Kong clock as the canteen `isOpen` helper. */
export function isGroceryOpen(id: GrocerySourceId, now = new Date()): boolean {
  const source = GROCERY_SOURCES[id];
  const { minutes: nowMin } = hktParts(now);
  return nowMin >= minutes(source.hours.open) && nowMin < minutes(source.hours.close);
}

export const MIXED_GROCERY_CHECKOUT_MESSAGE = "Please order from one store at a time.";
