/** Campus-scoped dish search — CUHK and CityU never mix. */

export type MealSearchCampus = "cuhk" | "cityu";

/** User-facing category chips (Part 2). */
export type MealBucket = "all" | "meals" | "drinks" | "snacks" | "desserts";

export type MealSort =
  | "best"
  | "price-asc"
  | "price-desc"
  | "distance"
  | "az"
  | "favorites";

export type DistanceFilter = "any" | "under10" | "10-15" | "15-20" | "20plus";

export type PriceFilter =
  | { kind: "none" }
  | { kind: "preset"; preset: "under20" | "20-40" | "40-60" | "60plus" }
  | { kind: "range"; min: number; max: number; maxPlus: boolean };

export type SearchableDish = {
  /** Stable key: `${canteenId}:${itemId}` */
  key: string;
  itemId: string;
  canteenId: string;
  canteenName: string;
  canteenShortName: string;
  name: string;
  description: string;
  /** Raw catalog category string (for matching + bucket mapping). */
  category: string;
  price: number;
  imageUrl: string | null;
  campus: MealSearchCampus;
  /** menuReady / status===open — can navigate to menu when also currently open. */
  orderable: boolean;
};

export type RankedDish = SearchableDish & {
  /** Currently within hours (and orderable). */
  openNow: boolean;
  /** coming soon or outside hours — greyed, not clickable. */
  interactive: boolean;
  matchTier: number;
  /** Minutes from the student's hall. Null when no hall is set or no path. */
  walkMinutes: number | null;
};

export type MealSearchFilters = {
  bucket: MealBucket;
  price: PriceFilter;
  openNowOnly: boolean;
  /** Empty = all canteens that appear in text/filter matches. */
  canteenIds: string[] | null;
  distance: DistanceFilter;
  sort: MealSort;
  favoritesOnly: boolean;
};
