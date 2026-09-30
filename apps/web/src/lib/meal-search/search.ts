import { dishMatchesBucket } from "@/lib/meal-search/category-buckets";
import { getCampusDishes } from "@/lib/meal-search/catalog";
import { isCanteenOpenNow } from "@/lib/meal-search/open-status";
import type {
  DistanceFilter,
  MealSearchCampus,
  MealSearchFilters,
  PriceFilter,
  RankedDish,
  SearchableDish,
} from "@/lib/meal-search/types";
import {
  distanceAvailable,
  walkMinutesForCanteen,
} from "@/lib/meal-search/walk";

export const MEAL_SEARCH_MIN_CHARS = 2;
export const MEAL_SEARCH_DEBOUNCE_MS = 250;
export const MEAL_SEARCH_PAGE_SIZE = 20;
export const MEAL_SEARCH_PRICE_CEILING = 100;

export const SUGGESTION_QUERIES = ["spicy", "chicken", "rice", "coffee"] as const;

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

function queryTokens(q: string): string[] {
  return q.toLowerCase().split(/\s+/).filter(Boolean);
}

/** Every word must match (so "spicy chicken" is not one exact phrase). */
function matchesQuery(dish: SearchableDish, q: string): boolean {
  const tokens = queryTokens(q);
  if (tokens.length === 0) return true;
  const blob = `${dish.name}\n${dish.description}\n${dish.category}`.toLowerCase();
  return tokens.every((token) => blob.includes(token));
}

function matchesDistance(
  minutes: number | null,
  filter: DistanceFilter,
): boolean {
  if (filter === "any") return true;
  if (minutes == null) return false;
  switch (filter) {
    case "under10":
      return minutes < 10;
    case "10-15":
      return minutes >= 10 && minutes < 15;
    case "15-20":
      return minutes >= 15 && minutes < 20;
    case "20plus":
      return minutes >= 20;
    default:
      return true;
  }
}

/**
 * Default ranking tiers when sort === "best" and query is non-empty:
 * 0 exact name, 1 name starts with, 2 name contains, 3 description/category.
 * Within a tier: open canteens first, then cheaper, then closer when a hall is set.
 *
 * TODO: do not rank by popularity (no order data).
 */
function matchTier(dish: SearchableDish, q: string): number {
  if (!q) return 0;
  const name = dish.name.toLowerCase();
  const query = q.toLowerCase();
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  const tokens = queryTokens(q);
  if (name.includes(query) || tokens.every((token) => name.includes(token))) return 2;
  return 3;
}

function enrich(
  campus: MealSearchCampus,
  dish: SearchableDish,
  q: string,
  now: Date,
  hall: string | null,
  college: string | null,
): RankedDish {
  const openNow = isCanteenOpenNow(campus, dish.canteenId, now);
  // Interactive only when currently open (coming soon + closed hours: not clickable).
  const interactive = dish.orderable && openNow;
  return {
    ...dish,
    openNow,
    interactive,
    matchTier: matchTier(dish, q),
    walkMinutes: walkMinutesForCanteen(campus, dish.canteenId, hall, college),
  };
}

function compareCloser(a: RankedDish, b: RankedDish): number {
  if (a.walkMinutes == null && b.walkMinutes == null) return 0;
  if (a.walkMinutes == null) return 1;
  if (b.walkMinutes == null) return -1;
  return a.walkMinutes - b.walkMinutes;
}

function compareBest(a: RankedDish, b: RankedDish): number {
  if (a.matchTier !== b.matchTier) return a.matchTier - b.matchTier;
  if (a.openNow !== b.openNow) return a.openNow ? -1 : 1;
  if (a.price !== b.price) return a.price - b.price;
  const closer = compareCloser(a, b);
  if (closer !== 0) return closer;
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

function compareDistance(a: RankedDish, b: RankedDish): number {
  const closer = compareCloser(a, b);
  if (closer !== 0) return closer;
  return comparePriceAsc(a, b);
}

export function hasActiveFilters(filters: MealSearchFilters): boolean {
  if (filters.bucket !== "all") return true;
  if (filters.price.kind !== "none") return true;
  if (filters.openNowOnly) return true;
  if (filters.canteenIds !== null) return true;
  if ((filters.distance ?? "any") !== "any") return true;
  if (filters.favoritesOnly) return true;
  return false;
}

export function countActiveFilters(filters: MealSearchFilters): number {
  let n = 0;
  if (filters.bucket !== "all") n += 1;
  if (filters.price.kind !== "none") n += 1;
  if (filters.openNowOnly) n += 1;
  if (filters.canteenIds !== null) n += 1;
  if ((filters.distance ?? "any") !== "any") n += 1;
  if (filters.favoritesOnly) n += 1;
  return n;
}

export function defaultFilters(): MealSearchFilters {
  return {
    bucket: "all",
    price: { kind: "none" },
    openNowOnly: false,
    canteenIds: null,
    distance: "any",
    sort: "best",
    favoritesOnly: false,
  };
}

/**
 * Effective sort: Best match only while a query is typed.
 * If query empty but filters active → Price ↑.
 */
export type MealSearchContext = {
  now?: Date;
  hall?: string | null;
  college?: string | null;
};

export function effectiveSort(
  query: string,
  filters: MealSearchFilters,
  hasHall = true,
): MealSearchFilters["sort"] {
  let sort = filters.sort;
  if (sort === "distance" && !hasHall) {
    sort = query.trim() ? "best" : "price-asc";
  }
  const q = query.trim();
  if (!q && hasActiveFilters(filters)) {
    // User may still pick Best — coerce only the default "best" when empty query.
    return sort === "best" ? "price-asc" : sort;
  }
  return sort;
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
  favoriteIds: ReadonlySet<string> | readonly string[] = [],
  context: MealSearchContext = {},
): MealSearchResult {
  const catalog = getCampusDishes(campus);
  // TODO: if catalog.length exceeds 500, move this filter/sort to a server
  // query. Keep it in-app — no Algolia, Elasticsearch, or new collection.
  const q = rawQuery.trim();
  const queryActive = q.length >= MEAL_SEARCH_MIN_CHARS;
  const filtersActive = hasActiveFilters(filters);
  const fav =
    favoriteIds instanceof Set ? favoriteIds : new Set(favoriteIds);
  const now = context.now ?? new Date();
  const hall = context.hall?.trim() || null;
  const college = context.college?.trim() || null;
  const hasHall = distanceAvailable(campus, hall, college);
  const distanceFilter: DistanceFilter = hasHall
    ? (filters.distance ?? "any")
    : "any";

  if (!queryActive && !filtersActive) {
    return {
      items: [],
      total: 0,
      canteensInResults: [],
      allClosed: false,
      emptyReason: "hidden",
    };
  }

  const textHits = queryActive
    ? catalog.filter((dish) => matchesQuery(dish, q))
    : catalog;

  // Text + category + price (before canteen multi-select and distance).
  const base = textHits.filter((dish) => {
    if (!dishMatchesBucket(dish.category, filters.bucket)) return false;
    if (!matchesPrice(dish.price, filters.price)) return false;
    return true;
  });

  let ranked = base.map((d) =>
    enrich(campus, d, queryActive ? q : "", now, hasHall ? hall : null, college),
  );

  if (filters.openNowOnly) {
    ranked = ranked.filter((d) => d.openNow);
  }

  if (filters.favoritesOnly) {
    ranked = ranked.filter((d) => fav.has(`canteen:${d.canteenId}:${d.itemId}`));
  }

  if (distanceFilter !== "any") {
    ranked = ranked.filter((d) => matchesDistance(d.walkMinutes, distanceFilter));
  }

  const canteenMap = new Map<string, { id: string; name: string; shortName: string }>();
  for (const d of ranked) {
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

  if (filters.canteenIds !== null) {
    const allow = new Set(filters.canteenIds);
    ranked = ranked.filter((d) => allow.has(d.canteenId));
  }

  const sort = effectiveSort(q, filters, hasHall);
  ranked.sort((a, b) => {
    if (sort === "favorites") {
      const aFav = fav.has(`canteen:${a.canteenId}:${a.itemId}`) ? 0 : 1;
      const bFav = fav.has(`canteen:${b.canteenId}:${b.itemId}`) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return comparePriceAsc(a, b);
    }
    switch (sort) {
      case "price-asc":
        return comparePriceAsc(a, b);
      case "price-desc":
        return comparePriceDesc(a, b);
      case "distance":
        return compareDistance(a, b);
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
    emptyReason = queryActive && textHits.length === 0 ? "query" : "filters";
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
