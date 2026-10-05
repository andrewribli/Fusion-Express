/**
 * Client-side grocery / menu search ranking.
 * Pure functions — no Firestore text search.
 */

export interface SearchableItem {
  id?: string;
  name: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  nameAlt?: string;
  description?: string;
  /** Often used for brand / "Sold at ParknShop" on Fusion catalog rows. */
  itemNote?: string;
  price?: number;
  inStock?: boolean;
  isAvailable?: boolean;
}

/** Grocery bucket priorities (1 = highest). */
export const GROCERY_CATEGORY_PRIORITY: Record<string, number> = {
  Dairy: 1,
  Produce: 2,
  Meat: 3,
  Pantry: 4,
  Frozen: 5,
  Bakery: 6,
  Beverages: 7,
  Snacks: 8,
  Household: 9,
  Toiletries: 10,
  "Personal Care": 11,
};

/** Buckets treated as "primary" for whole-word name matches. */
const PRIMARY_BUCKETS = new Set(["Produce", "Meat", "Dairy"]);

const UNKNOWN_CATEGORY_PRIORITY = 50;

/** Query tokens that should boost a grocery bucket even without a name hit. */
const QUERY_TO_CATEGORY: Record<string, string> = {
  milk: "Dairy",
  dairy: "Dairy",
  yoghurt: "Dairy",
  yogurt: "Dairy",
  cheese: "Dairy",
  butter: "Dairy",
  cream: "Dairy",
  produce: "Produce",
  fruit: "Produce",
  vegetable: "Produce",
  veg: "Produce",
  meat: "Meat",
  beef: "Meat",
  chicken: "Meat",
  pork: "Meat",
  seafood: "Meat",
  pantry: "Pantry",
  frozen: "Frozen",
  bakery: "Bakery",
  bread: "Bakery",
  drink: "Beverages",
  drinks: "Beverages",
  beverage: "Beverages",
  beverages: "Beverages",
  snack: "Snacks",
  snacks: "Snacks",
  household: "Household",
  toiletries: "Toiletries",
  shampoo: "Toiletries",
  "personal care": "Personal Care",
};

/** Map aisle / category / subcategory labels onto grocery buckets. */
const CATEGORY_ALIASES: Array<{ bucket: string; patterns: RegExp[] }> = [
  // Frozen before Produce so "Frozen Vegetables" does not land in Produce.
  { bucket: "Frozen", patterns: [/frozen/, /ice.?cream/] },
  {
    bucket: "Dairy",
    patterns: [
      /dairy/,
      /\beggs?\b/,
      /\bmilk\b/,
      /cheese/,
      /yoghurt/,
      /yogurt/,
      /butter/,
    ],
  },
  {
    bucket: "Produce",
    patterns: [/produce/, /fruit/, /berrie/, /vegetable/, /\bveg\b/],
  },
  {
    bucket: "Meat",
    patterns: [
      /\bmeat\b/,
      /meat\s*[-—]?\s*beef/,
      /meat\s*[-—]?\s*chicken/,
      /meat\s*[-—]?\s*pork/,
      /meat\s*[-—]?\s*other/,
      /ready.?to.?cook/,
      /\bbeef\b/,
      /\bchicken\b/,
      /\bpork\b/,
      /seafood/,
      /\bfish\b/,
    ],
  },
  {
    bucket: "Pantry",
    patterns: [
      /pantry/,
      /rice/,
      /grain/,
      /noodle/,
      /sauce/,
      /condiment/,
      /seasoning/,
      /canned/,
      /oils?\s*(and|&)?\s*vinegar/,
    ],
  },
  { bucket: "Bakery", patterns: [/bakery/, /bread/, /pastry/] },
  {
    bucket: "Beverages",
    patterns: [
      /beverage/,
      /\bdrinks?\b/,
      /juice/,
      /\bwater\b/,
      /coffee/,
      /\btea\b/,
      /hot.?drink/,
      /tea\s*(and|&)\s*coffee/,
    ],
  },
  {
    bucket: "Snacks",
    patterns: [
      /snack/,
      /chip/,
      /cracker/,
      /biscuit/,
      /candy/,
      /chocolate/,
      /sweet/,
      /confection/,
    ],
  },
  {
    bucket: "Household",
    patterns: [/household/, /cleaning/, /laundry/, /detergent/, /paper.?goods/],
  },
  {
    bucket: "Toiletries",
    patterns: [/toiletr/, /shampoo/, /soap/, /toothpaste/, /oral/],
  },
  {
    bucket: "Personal Care",
    patterns: [/personal.?care/, /skincare/, /cosmetic/, /beauty/],
  },
];

/**
 * Processed / flavored products that must not outrank a fresh primary-category
 * whole-word match for the same ingredient query.
 */
const DERIVED_NAME_RE =
  /\b(?:yoghurts?|yogurts?|jams?|spreads?|juices?|flavou?red|flavou?rs?|sauces?|cand(?:y|ies)|ice\s*creams?|smoothies?|drinks?|powders?|syrups?|cereals?|snacks?|shampoos?|conditioners?|soaps?)\b/i;

/** When the query itself names a derived product type, do not penalize. */
const DERIVED_QUERY_TERMS = new Set([
  "yogurt",
  "yoghurt",
  "yogurts",
  "yoghurts",
  "jam",
  "jams",
  "spread",
  "spreads",
  "juice",
  "juices",
  "sauce",
  "sauces",
  "candy",
  "candies",
  "smoothie",
  "smoothies",
  "drink",
  "drinks",
  "powder",
  "powders",
  "syrup",
  "syrups",
  "cereal",
  "cereals",
  "snack",
  "snacks",
  "shampoo",
  "shampoos",
  "conditioner",
  "conditioners",
  "soap",
  "soaps",
  "ice cream",
  "icecream",
]);

export const SCORE_EXACT_NAME = 1000;
/** Whole-word name match in a primary grocery category (Produce / Meat / Dairy). */
export const SCORE_WHOLE_WORD_PRIMARY = 920;
/** Whole-word name match outside primary categories. */
export const SCORE_WHOLE_WORD_SECONDARY = 880;
/** @deprecated Prefer SCORE_WHOLE_WORD_PRIMARY — kept for existing callers/tests. */
export const SCORE_WHOLE_WORD = SCORE_WHOLE_WORD_PRIMARY;
export const SCORE_CATEGORY = 800;
export const SCORE_NAME_PREFIX = 700;
/** Whole-word hit on a derived product (yogurt/juice/flavored snack, etc.). */
export const SCORE_WHOLE_WORD_DERIVED = 650;
export const SCORE_NAME_SUBSTRING = 600;
export const SCORE_DESCRIPTION = 500;
export const SCORE_FUZZY = 400;

function normalize(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

/** Split on whitespace / punctuation; keeps "milky" as one token. */
export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function hasWholeWord(text: string, word: string): boolean {
  const q = normalize(word);
  if (!q) return false;
  return tokenize(text).includes(q);
}

/** Light singular/plural variants for produce-style queries. */
export function queryVariants(query: string): string[] {
  const q = normalize(query);
  if (!q) return [];
  const out = new Set<string>([q]);

  if (q.endsWith("ies") && q.length > 4) {
    out.add(`${q.slice(0, -3)}y`); // strawberries → strawberry
  } else if (q.endsWith("oes") && q.length > 4) {
    out.add(q.slice(0, -2)); // tomatoes → tomato
  } else if (q.endsWith("ses") && q.length > 4) {
    out.add(q.slice(0, -2)); // juices → juice (approx)
  } else if (q.endsWith("s") && !q.endsWith("ss") && q.length > 3) {
    out.add(q.slice(0, -1)); // apples → apple
  }

  if (q.endsWith("y") && q.length > 2 && !q.endsWith("ey")) {
    out.add(`${q.slice(0, -1)}ies`); // strawberry → strawberries
  } else if (!q.endsWith("s")) {
    out.add(`${q}s`); // apple → apples
  }

  return [...out];
}

function textHasQueryWord(text: string, query: string): boolean {
  return queryVariants(query).some((v) => hasWholeWord(text, v));
}

function textEqualsQuery(text: string, query: string): boolean {
  const n = normalize(text);
  return queryVariants(query).some((v) => n === v);
}

function textStartsWithQuery(text: string, query: string): boolean {
  return queryVariants(query).some((v) => nameStartsWithQuery(text, v));
}

function textIncludesQuery(text: string, query: string): boolean {
  const n = normalize(text);
  return queryVariants(query).some((v) => n.includes(v));
}

/** True when the product name looks like a processed/flavored form. */
export function isDerived(name: string): boolean {
  return DERIVED_NAME_RE.test(normalize(name));
}

function shouldPenalizeDerived(name: string, query: string): boolean {
  const q = normalize(query);
  if (!q || DERIVED_QUERY_TERMS.has(q)) return false;
  return isDerived(name);
}

export function levenshtein(a: string, b: string): number {
  const s = normalize(a);
  const t = normalize(b);
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;

  const prev = new Array<number>(t.length + 1);
  const curr = new Array<number>(t.length + 1);
  for (let j = 0; j <= t.length; j++) prev[j] = j;

  for (let i = 1; i <= s.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= t.length; j++) prev[j] = curr[j]!;
  }
  return prev[t.length]!;
}

export function groceryBucketForItem(item: SearchableItem): string | null {
  const hay = [
    item.subcategory,
    item.category,
    typeof item.category === "string" ? item.category.replace(/[-_]/g, " ") : "",
  ]
    .map(normalize)
    .filter(Boolean)
    .join(" ");

  for (const { bucket, patterns } of CATEGORY_ALIASES) {
    if (patterns.some((re) => re.test(hay))) return bucket;
  }
  return null;
}

export function isPrimaryCategory(item: SearchableItem): boolean {
  const bucket = groceryBucketForItem(item);
  return bucket != null && PRIMARY_BUCKETS.has(bucket);
}

export function categoryPriority(item: SearchableItem): number {
  const bucket = groceryBucketForItem(item);
  if (!bucket) return UNKNOWN_CATEGORY_PRIORITY;
  return GROCERY_CATEGORY_PRIORITY[bucket] ?? UNKNOWN_CATEGORY_PRIORITY;
}

function itemIsAvailable(item: SearchableItem): boolean {
  if (item.isAvailable === false) return false;
  if (item.inStock === false) return false;
  return true;
}

function effectivePrice(item: SearchableItem): number {
  const p = item.price;
  if (typeof p === "number" && p > 0) return p;
  return Number.POSITIVE_INFINITY;
}

function nameFields(item: SearchableItem): string[] {
  return [item.name, item.nameAlt, item.brand, item.itemNote]
    .map(normalize)
    .filter(Boolean);
}

function primaryName(item: SearchableItem): string {
  return normalize(item.name);
}

function descriptionText(item: SearchableItem): string {
  return normalize(item.description);
}

function categoryText(item: SearchableItem): string {
  return [item.category, item.subcategory]
    .map(normalize)
    .filter(Boolean)
    .join(" ");
}

function queryMapsToItemCategory(q: string, item: SearchableItem): boolean {
  const mapped = QUERY_TO_CATEGORY[q];
  if (!mapped) return false;
  const bucket = groceryBucketForItem(item);
  if (bucket === mapped) return true;

  // Meat protein queries also match consolidated meat subcategories directly.
  const cat = categoryText(item);
  if (mapped === "Meat") {
    if (q === "beef" && /beef/.test(cat)) return true;
    if (q === "chicken" && /chicken/.test(cat)) return true;
    if (q === "pork" && /pork/.test(cat)) return true;
    if (q === "seafood" && /seafood|fish/.test(cat)) return true;
    if (q === "meat" && /meat|beef|chicken|pork|seafood/.test(cat)) return true;
  }
  return false;
}

/** True when text begins with q as a full token ("milk…" yes, "milky…" no). */
export function nameStartsWithQuery(text: string, q: string): boolean {
  const n = normalize(text);
  const query = normalize(q);
  if (!query || !n.startsWith(query)) return false;
  if (n.length === query.length) return true;
  return /[^a-z0-9]/.test(n[query.length]!);
}

function fuzzyNameMatch(item: SearchableItem, q: string): boolean {
  if (q.length < 3) return false;
  const name = primaryName(item);
  if (queryVariants(q).some((v) => levenshtein(name, v) <= 2)) return true;
  const tokens = tokenize(item.name);
  // Prefer primary (longer) tokens so brand noise doesn't dominate.
  const primary = [...tokens].sort((a, b) => b.length - a.length).slice(0, 4);
  return primary.some(
    (tok) =>
      tok.length >= 3 &&
      queryVariants(q).some((v) => levenshtein(tok, v) <= 2),
  );
}

/**
 * Score a single item against query q (already lowercased/trimmed preferred).
 * Returns 0 when the item should not appear in results.
 *
 * Tiers:
 * 1. Exact name === q (incl. light singular/plural)
 * 2. Whole-word in name + primary category (non-derived)
 * 3. Whole-word in name + secondary category (non-derived)
 * 4. Category name / mapped category match
 * 5. Name starts with q
 * 6. Derived whole-word (yogurt/juice/flavored…) — below primary fresh hits
 * 7. Substring / compound match
 * 8. Description
 * 9. Fuzzy
 */
export function scoreItem(item: SearchableItem, query: string): number {
  const q = normalize(query);
  if (!q) return 0;

  const name = primaryName(item);
  const names = nameFields(item);
  const derived = shouldPenalizeDerived(item.name, q);

  if (textEqualsQuery(name, q) || names.some((n) => textEqualsQuery(n, q))) {
    return SCORE_EXACT_NAME;
  }

  const wholeWord = names.some((n) => textHasQueryWord(n, q));
  if (wholeWord) {
    if (derived) return SCORE_WHOLE_WORD_DERIVED;
    if (isPrimaryCategory(item)) return SCORE_WHOLE_WORD_PRIMARY;
    return SCORE_WHOLE_WORD_SECONDARY;
  }

  const cat = categoryText(item);
  if (
    queryVariants(q).some((v) => cat.includes(v)) ||
    queryMapsToItemCategory(q, item)
  ) {
    return SCORE_CATEGORY;
  }

  if (names.some((n) => textStartsWithQuery(n, q))) return SCORE_NAME_PREFIX;

  if (names.some((n) => textIncludesQuery(n, q))) return SCORE_NAME_SUBSTRING;

  if (textIncludesQuery(descriptionText(item), q)) return SCORE_DESCRIPTION;

  if (fuzzyNameMatch(item, q)) return SCORE_FUZZY;

  return 0;
}

export function compareRankedItems(
  a: SearchableItem,
  b: SearchableItem,
  query: string,
): number {
  const sa = scoreItem(a, query);
  const sb = scoreItem(b, query);
  if (sb !== sa) return sb - sa;

  const availA = itemIsAvailable(a) ? 0 : 1;
  const availB = itemIsAvailable(b) ? 0 : 1;
  if (availA !== availB) return availA - availB;

  // Within the same score tier, non-derived still beats derived.
  const q = normalize(query);
  const derA = shouldPenalizeDerived(a.name, q) ? 1 : 0;
  const derB = shouldPenalizeDerived(b.name, q) ? 1 : 0;
  if (derA !== derB) return derA - derB;

  const pa = categoryPriority(a);
  const pb = categoryPriority(b);
  if (pa !== pb) return pa - pb;

  const priceA = effectivePrice(a);
  const priceB = effectivePrice(b);
  if (priceA !== priceB) return priceA - priceB;

  return primaryName(a).localeCompare(primaryName(b));
}

/** Filter to scored matches and sort by relevance tiers. */
export function rankItemsByQuery<T extends SearchableItem>(
  items: T[],
  query: string,
): T[] {
  const q = normalize(query);
  if (!q) return [...items];

  return items
    .map((item) => ({ item, score: scoreItem(item, q) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return compareRankedItems(a.item, b.item, q);
    })
    .map((row) => row.item);
}
