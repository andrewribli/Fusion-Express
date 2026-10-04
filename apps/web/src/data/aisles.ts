import catalog from "@fusion-express/shared/data/foodpanda-fusion-catalog.json";
import type { MenuCategory } from "@/lib/types";
import type { StoreSection } from "@fusion-express/shared/types";

export type { StoreSection };

export interface Aisle {
  id: string;
  label: string;
  section: StoreSection;
  /** Match items by Firestore/menu category */
  menuCategories?: MenuCategory[];
  /** Match specific item IDs */
  itemIds?: string[];
}

interface CatalogNode {
  name: string;
  items?: unknown[];
  subcategories?: CatalogNode[];
}

const FRESH_FOOD_LABELS = new Set(["fresh food", "refrigerated"]);
const GROCERIES_LABELS = new Set(["groceries", "non-refrigerated", "dry"]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

/** Pretty labels for consolidated aisle ids (em dash in UI). */
const AISLE_LABEL_OVERRIDES: Record<string, string> = {
  "meat-beef": "Meat — Beef",
  "meat-chicken": "Meat — Chicken",
  "meat-pork": "Meat — Pork",
  "meat-other": "Meat — Other",
  "butter-and-spreads": "Butter & Spreads",
  "rice-and-grains": "Rice & Grains",
  "tea-and-coffee": "Tea & Coffee",
  "oils-and-vinegar": "Oils & Vinegar",
  "paper-goods": "Paper Goods",
  "ready-to-cook": "Ready to Cook",
  "frozen-meals": "Frozen Meals",
  "frozen-meat": "Frozen Meat",
  "frozen-vegetables": "Frozen Vegetables",
  "canned-goods": "Canned Goods",
  "bread-and-bakery": "Bread & Bakery",
};

/**
 * Legacy catalog subcategory slugs that should appear under a consolidated aisle.
 * Keeps browse/search working if any item still carries the old category id.
 */
const LEGACY_MENU_CATEGORIES: Record<string, string[]> = {
  produce: ["produce", "fruit", "fruit-and-berries", "vegetables"],
  "meat-beef": ["meat-beef", "beef"],
  "meat-chicken": ["meat-chicken", "chicken"],
  "meat-pork": ["meat-pork", "pork"],
  "meat-other": ["meat-other", "meat", "others", "other"],
  seafood: ["seafood"],
  milk: ["milk", "dairy"],
  cheese: ["cheese"],
  yogurt: ["yogurt", "yoghurt"],
  "butter-and-spreads": ["butter-and-spreads", "butter"],
  eggs: ["eggs"],
  "ready-to-cook": ["ready-to-cook"],
  "frozen-meals": ["frozen-meals", "frozen-food", "frozen"],
  "frozen-meat": ["frozen-meat"],
  "frozen-vegetables": ["frozen-vegetables"],
  "rice-and-grains": ["rice-and-grains", "rice-noodles", "pantry"],
  noodles: ["noodles", "instant-noodles"],
  "canned-goods": ["canned-goods"],
  condiments: ["condiments", "sauces", "pickles"],
  seasonings: ["seasonings"],
  "tea-and-coffee": ["tea-and-coffee", "tea", "hot-drinks"],
  snacks: ["snacks", "chips", "crackers", "biscuits", "confectionary"],
  toiletries: ["toiletries"],
  cleaning: ["cleaning", "cleaning-supplies", "household"],
  "paper-goods": ["paper-goods"],
  drinks: ["drinks"],
  "bread-and-bakery": ["bread-and-bakery", "bread"],
};

/** Preferred sidebar order (Fresh Food / Dairy & Chilled / Frozen). */
const REFRIGERATED_ORDER = [
  "produce",
  "meat-beef",
  "meat-chicken",
  "meat-pork",
  "meat-other",
  "seafood",
  "milk",
  "cheese",
  "yogurt",
  "butter-and-spreads",
  "eggs",
  "ready-to-cook",
  "frozen-meals",
  "frozen-meat",
  "frozen-vegetables",
] as const;

/** Preferred sidebar order (Pantry / Household + leftover grocery aisles). */
const DRY_ORDER = [
  "rice-and-grains",
  "noodles",
  "canned-goods",
  "condiments",
  "seasonings",
  "oils-and-vinegar",
  "tea-and-coffee",
  "snacks",
  "drinks",
  "bread-and-bakery",
  "toiletries",
  "cleaning",
  "paper-goods",
  "other",
] as const;

function aislesFromCatalog(section: StoreSection): Aisle[] {
  const wantFresh = section === "refrigerated";
  const categories =
    (catalog as { categories: CatalogNode[] }).categories ?? [];
  const out: Aisle[] = [];
  const seen = new Set<string>();

  for (const cat of categories) {
    const label = cat.name.trim().toLowerCase();
    const isFresh = FRESH_FOOD_LABELS.has(label);
    const isGroceries = GROCERIES_LABELS.has(label) || (!isFresh && !wantFresh);
    if (wantFresh ? !isFresh : !isGroceries && isFresh) continue;
    if (wantFresh !== isFresh) continue;

    for (const sub of cat.subcategories ?? []) {
      const id = slugify(sub.name);
      if (!id || seen.has(id)) continue;
      // Skip empty placeholder aisles (e.g. Oils & Vinegar / Paper Goods).
      if (!(sub.items && sub.items.length > 0)) continue;
      seen.add(id);
      const legacy = LEGACY_MENU_CATEGORIES[id] ?? [id];
      out.push({
        id,
        label: AISLE_LABEL_OVERRIDES[id] ?? sub.name,
        section,
        menuCategories: legacy as MenuCategory[],
      });
    }
  }

  const order: readonly string[] = wantFresh
    ? REFRIGERATED_ORDER
    : DRY_ORDER;
  return out.sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    if (ai >= 0 || bi >= 0) {
      if (ai >= 0 && bi >= 0) return ai - bi;
      return ai >= 0 ? -1 : 1;
    }
    return a.label.localeCompare(b.label);
  });
}

export const REFRIGERATED_AISLES: Aisle[] = aislesFromCatalog("refrigerated");
export const DRY_AISLES: Aisle[] = aislesFromCatalog("dry");

export const SECTION_META: Record<
  StoreSection,
  { title: string; subtitle: string }
> = {
  refrigerated: {
    title: "Fresh Food",
    subtitle: "Produce, meat, dairy & frozen",
  },
  dry: {
    title: "Groceries",
    subtitle: "Pantry, snacks & household",
  },
};

export function getAislesForSection(section: StoreSection): Aisle[] {
  return section === "refrigerated" ? REFRIGERATED_AISLES : DRY_AISLES;
}

/** Old browse URLs → consolidated aisle ids. */
const AISLE_ID_ALIASES: Record<string, string> = {
  beef: "meat-beef",
  chicken: "meat-chicken",
  pork: "meat-pork",
  meat: "meat-other",
  others: "meat-other",
  fruit: "produce",
  "fruit-and-berries": "produce",
  vegetables: "produce",
  dairy: "milk",
  "frozen-food": "frozen-meals",
  "instant-noodles": "noodles",
  "rice-noodles": "rice-and-grains",
  tea: "tea-and-coffee",
  "hot-drinks": "tea-and-coffee",
  sauces: "condiments",
  pickles: "condiments",
  chips: "snacks",
  crackers: "snacks",
  biscuits: "snacks",
  confectionary: "snacks",
  "cleaning-supplies": "cleaning",
  household: "cleaning",
};

export function resolveAisleId(aisleId: string): string {
  return AISLE_ID_ALIASES[aisleId] ?? aisleId;
}

export function getAisle(section: StoreSection, aisleId: string): Aisle | undefined {
  const resolved = resolveAisleId(aisleId);
  return getAislesForSection(section).find((a) => a.id === resolved);
}

export function isValidSection(section: string): section is StoreSection {
  return section === "refrigerated" || section === "dry";
}

export function refrigeratedAisleIds(): Set<string> {
  return new Set(REFRIGERATED_AISLES.map((a) => a.id));
}
