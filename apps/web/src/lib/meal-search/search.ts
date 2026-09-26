import { dishMatchesBucket } from "@/lib/meal-search/category-buckets";
import { getCampusDishes } from "@/lib/meal-search/catalog";
import { isCanteenOpenNow } from "@/lib/meal-search/open-status";
import type {
  MealSearchCampus,
  MealSearchFilters,
  PriceFilter,
  RankedDish,
  SearchableDish,
} from "@/lib/meal-search/types";

export const MEAL_SEARCH_MIN_CHARS = 2;
export const MEAL_SEARCH_DEBOUNCE_MS = 250;
export const MEAL_SEARCH_PAGE_SIZE = 20;
export const MEAL_SEARCH_PRICE_CEILING = 100;

export const SUGGESTION_QUERIES = ["chicken", "rice", "noodles", "coffee"] as const;

function matchesPrice(price: number, filter: PriceFilter): boolean {
  switch (filter.kind) {
    case "none":
      return true;
    case "preset":
      switch (filter.preset) {
        case "under20":
          return price < 20;
        case "20-40":
          return price >= 20 && price < 40;
        case "40-60":
          return price >= 40 && price < 60;
        case "60plus":
          return price >= 60;
        default:
          return true;
      }
    case "range": {
      const hi = filter.maxPlus ? Number.POSITIVE_INFINITY : filter.max;
      return price >= filter.min && price <= hi;
    }
    default:
      return true;
  }
}

/** Partial-word match: "chick" → "chicken". */
function textIncludes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function matchesQuery(dish: SearchableDish, q: string): boolean {
  if (!q) return true;
  return (
    textIncludes(dish.name, q) ||
    textIncludes(dish.description, q) ||
    textIncludes(dish.category, q) ||
    textIncludes(dish.canteenName, q) ||
    textIncludes(dish.canteenShortName, q)
  );
}

/**
 * Default ranking tiers when sort === "best" and query is non-empty:
 * 0 exact name, 1 name starts with, 2 name contains, 3 description/category.
 * Within a tier: open canteens first, then cheaper.
 *
 * TODO: do not rank by popularity (no order data).
 */
function matchTier(dish: SearchableDish, q: string): number {
  if (!q) return 0;
  const name = dish.name.toLowerCase();
  const query = q.toLowerCase();
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  return 3;
}

function enrich(
  campus: MealSearchCampus,
  dish: SearchableDish,
  q: string,
): RankedDish {
  const openNow = isCanteenOpenNow(campus, dish.canteenId);
  // Interactive only when currently open (coming soon + closed hours: not clickable).
  const interactive = dish.orderable && openNow;
  return {
    ...dish,
    openNow,
    interactive,
    matchTier: matchTier(dish, q),
  };
}

function compareBest(a: RankedDish, b: RankedDish): number {
  if (a.matchTier !== b.matchTier) return a.matchTier - b.matchTier;
  if (a.openNow !== b.openNow) return a.openNow ? -1 : 1;
  if (a.price !== b.price) return a.price - b.price;
  return a.name.localeCompare(b.name);
}

function comparePriceAsc(a: RankedDish, b: RankedDish): number {
  if (a.price !== b.price) return a.price - b.price;
  return a.name.localeCompare(b.name);
}

function comparePriceDesc(a: RankedDish, b: RankedDish): number {
  if (a.price !== b.price) return b.price - a.price;
  return a.name.localeCompare(b.name);
}

function compareAz(a: RankedDish, b: RankedDish): number {
  return a.name.localeCompare(b.name) || a.price - b.price;
}

export function hasActiveFilters(filters: MealSearchFilters): boolean {
  if (filters.bucket !== "all") return true;
  if (filters.price.kind !== "none") return true;
  if (filters.openNowOnly) return true;
  if (filters.canteenIds !== null) return true;
  return false;
}

export function countActiveFilters(filters: MealSearchFilters): number {
  let n = 0;
  if (filters.bucket !== "all") n += 1;
  if (filters.price.kind !== "none") n += 1;
  if (filters.openNowOnly) n += 1;
  if (filters.canteenIds !== null) n += 1;
  return n;
}

export function defaultFilters(): MealSearchFilters {
  return {
    bucket: "all",
    price: { kind: "none" },
    openNowOnly: false,
    canteenIds: null,
    sort: "best",
  };
}

/**
 * Effective sort: Best match only while a query is typed.
 * If query empty but filters active → Price ↑.
 */
export function effectiveSort(
  query: string,
  filters: MealSearchFilters,
): MealSearchFilters["sort"] {
  const q = query.trim();
  if (!q && hasActiveFilters(filters)) {
    // User may still pick Best — coerce only the default "best" when empty query.
    return filters.sort === "best" ? "price-asc" : filters.sort;
  }
  return filters.sort;
}

export type MealSearchResult = {
  items: RankedDish[];
  total: number;
  /** Canteens that have at least one text+bucket+price match (before canteen multi-select / open-now hide). */
  canteensInResults: { id: string; name: string; shortName: string }[];
  allClosed: boolean;
  emptyReason: "hidden" | "query" | "filters" | null;
};

export function searchCampusDishes(
  campus: MealSearchCampus,
  rawQuery: string,
  filters: MealSearchFilters,
): MealSearchResult {
  const catalog = getCampusDishes(campus);
  const q = rawQuery.trim();
  const queryActive = q.length >= MEAL_SEARCH_MIN_CHARS;
  const filtersActive = hasActiveFilters(filters);

  if (!queryActive && !filtersActive) {
    return {
      items: [],
      total: 0,
      canteensInResults: [],
      allClosed: false,
      emptyReason: "hidden",
    };
  }

  // Text + category + price (before canteen multi-select) — drives canteen chip list.
  const base = catalog.filter((dish) => {
    if (queryActive && !matchesQuery(dish, q)) return false;
    if (!dishMatchesBucket(dish.category, filters.bucket)) return false;
    if (!matchesPrice(dish.price, filters.price)) return false;
    return true;
  });

  const canteenMap = new Map<string, { id: string; name: string; shortName: string }>();
  for (const d of base) {
    if (!canteenMap.has(d.canteenId)) {
      canteenMap.set(d.canteenId, {
        id: d.canteenId,
        name: d.canteenName,
        shortName: d.canteenShortName,
      });
    }
  }
  const canteensInResults = [...canteenMap.values()].sort((a, b) =>
    a.shortName.localeCompare(b.shortName),
  );

  let filtered = base;
  if (filters.canteenIds !== null) {
    const allow = new Set(filters.canteenIds);
    filtered = filtered.filter((d) => allow.has(d.canteenId));
  }

  let ranked = filtered.map((d) => enrich(campus, d, queryActive ? q : ""));

  if (filters.openNowOnly) {
    ranked = ranked.filter((d) => d.openNow);
  }

  const sort = effectiveSort(q, filters);
  ranked.sort((a, b) => {
    switch (sort) {
      case "price-asc":
        return comparePriceAsc(a, b);
      case "price-desc":
        return comparePriceDesc(a, b);
      case "az":
        return compareAz(a, b);
      case "best":
      default:
        return compareBest(a, b);
    }
  });

  const allClosed =
    ranked.length > 0 && ranked.every((d) => !d.openNow);

  let emptyReason: MealSearchResult["emptyReason"] = null;
  if (ranked.length === 0) {
    emptyReason = queryActive && !filtersActive ? "query" : "filters";
  }

  return {
    items: ranked,
    total: ranked.length,
    canteensInResults,
    allClosed,
    emptyReason,
  };
}

export function formatEstPrice(price: number): string {
  const rounded =
    Math.abs(price - Math.round(price)) < 0.05
      ? String(Math.round(price))
      : price.toFixed(1).replace(/\.0$/, "");
  return `Est. HK$${rounded}`;
}
