/**
 * Map real catalog category names onto Meals | Drinks | Snacks | Desserts.
 *
 * CUHK catalogs mostly use: mains | snacks | drinks | dessert.
 * CityU / UC use free-text section titles (Thai Soup Noodles, Coffee Lounge, …).
 *
 * Bucket rules (close variants kept — never drop an item into nowhere):
 * - Meals: Mains, Rice, Noodles, Fast Food, plus meal-like sections
 *   (kebabs, biryani, pizza, burgers, hot pot, dim sum, breakfast sets, etc.)
 * - Drinks: Beverages, Coffee, Tea, Soft Drinks, Café, Coffee Lounge, Tea House*
 * - Snacks: Snacks, Sides, Side Orders, Salads, Add-ons, Afternoon Bites
 * - Desserts: Desserts / Dessert / Ice Cream
 *
 * Ambiguous marketing sections (e.g. "Back to School Offers", "Upgrade Combos")
 * fall into Meals when they contain food sets; pure drink names still match
 * Drinks via keyword heuristics on the category string.
 */

import type { MealBucket } from "@/lib/meal-search/types";

const MEALS_EXACT = new Set(
  [
    "mains",
    "main",
    "meals",
    "meal",
    "rice",
    "noodles",
    "fast food",
    "fastfood",
    "breakfast",
    "lunch",
    "dinner",
    "tea time",
  ].map((s) => s.toLowerCase()),
);

const DRINKS_EXACT = new Set(
  [
    "drinks",
    "drink",
    "beverages",
    "beverage",
    "coffee",
    "tea",
    "soft drinks",
    "soft drink",
    "café",
    "cafe",
    "coffee lounge",
  ].map((s) => s.toLowerCase()),
);

const SNACKS_EXACT = new Set(
  [
    "snacks",
    "snack",
    "sides",
    "side",
    "side orders",
    "add-ons",
    "addons",
    "add ons",
  ].map((s) => s.toLowerCase()),
);

const DESSERTS_EXACT = new Set(
  ["desserts", "dessert", "sweets", "sweet"].map((s) => s.toLowerCase()),
);

function includesAny(hay: string, needles: string[]): boolean {
  return needles.some((n) => hay.includes(n));
}

/**
 * Resolve a catalog category string to a filter bucket.
 * Unknown / promotional sections default to Meals so items stay filterable.
 */
export function categoryToBucket(category: string): Exclude<MealBucket, "all"> {
  const raw = category.trim();
  const c = raw.toLowerCase();

  if (DESSERTS_EXACT.has(c) || includesAny(c, ["dessert", "ice cream", "cake"])) {
    return "desserts";
  }

  if (
    DRINKS_EXACT.has(c) ||
    includesAny(c, [
      "beverage",
      "coffee",
      "tea house",
      "soft drink",
      "drink",
      "soda",
      "milk tea",
      "milk cap",
    ])
  ) {
    // "Tea Time" is a meal period section, not drinks.
    if (c === "tea time" || c === "tea") {
      if (c === "tea") return "drinks";
      return "meals";
    }
    return "drinks";
  }

  if (
    SNACKS_EXACT.has(c) ||
    includesAny(c, [
      "snack",
      "side order",
      "sides",
      "salad",
      "add-on",
      "addon",
      "afternoon bites",
      "potato wedge",
      "chips",
    ])
  ) {
    return "snacks";
  }

  if (
    MEALS_EXACT.has(c) ||
    includesAny(c, [
      "main",
      "meal",
      "rice",
      "noodle",
      "udon",
      "spaghetti",
      "burger",
      "kebab",
      "shawarma",
      "biryani",
      "curry",
      "pizza",
      "donburi",
      "hot pot",
      "roast",
      "dim sum",
      "sandwich",
      "croissant",
      "bibimbap",
      "halal",
      "home-style",
      "breakfast",
      "set",
      "combo",
      "offer",
      "savory",
      "meat",
      "thai",
      "japanese",
      "vietnamese",
      "sichuan",
      "taiwanese",
      "vegetarian",
      "scallion",
      "continental",
      "garden salad", // UC mealbox-adjacent; still food
    ])
  ) {
    return "meals";
  }

  // Close variant fallback — keep items visible under Meals.
  return "meals";
}

export function dishMatchesBucket(
  category: string,
  bucket: MealBucket,
): boolean {
  if (bucket === "all") return true;
  return categoryToBucket(category) === bucket;
}
