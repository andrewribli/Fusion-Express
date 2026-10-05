import catalog from "@fusion-express/shared/data/foodpanda-fusion-catalog.json";
import { cleanBrand, cleanProductName } from "@fusion-express/shared";
import {
  isGenericImageUrl,
  resolveProductImage,
} from "@fusion-express/shared/resolve-image";
import type { MenuItem, StoreSection } from "@/lib/types";

interface CatalogItem {
  name: string;
  price: number;
  category: string;
  subcategory?: string;
  brand?: string;
  /** Alternate shop name or brand the customer might type (shown under the name). */
  nameAlt?: string;
  image?: string;
  weight?: number;
  bulkDealPrice?: number;
  bulkDealQty?: number;
  priceOnRequest?: boolean;
  sourceId?: string;
  campus?: string;
  isAvailable?: boolean;
}

/** Legacy subcategory → consolidated aisle label (additive safety net). */
const SUBCATEGORY_CONSOLIDATION: Record<string, string> = {
  Fruit: "Produce",
  "Fruit & Berries": "Produce",
  Vegetables: "Produce",
  Beef: "Meat - Beef",
  Chicken: "Meat - Chicken",
  Pork: "Meat - Pork",
  Meat: "Meat - Other",
  Others: "Meat - Other",
  Other: "Meat - Other",
  "Frozen Food": "Frozen Meals",
  Dairy: "Milk",
  "Instant Noodles": "Noodles",
  "Rice & Noodles": "Rice & Grains",
  Tea: "Tea & Coffee",
  "Hot Drinks": "Tea & Coffee",
  Sauces: "Condiments",
  Pickles: "Condiments",
  Chips: "Snacks",
  Crackers: "Snacks",
  Biscuits: "Snacks",
  Confectionary: "Snacks",
  "Cleaning Supplies": "Cleaning",
  Household: "Cleaning",
  Pantry: "Rice & Grains",
};

function consolidateSubcategory(subcategory: string): string {
  return SUBCATEGORY_CONSOLIDATION[subcategory] ?? subcategory;
}

interface CatalogNode {
  name: string;
  items?: CatalogItem[];
  subcategories?: CatalogNode[];
}

const FRESH_FOOD_LABELS = new Set(["fresh food", "refrigerated"]);

export function catalogStoreSection(topLevelCategory: string): StoreSection {
  const label = topLevelCategory.trim().toLowerCase();
  return FRESH_FOOD_LABELS.has(label) ? "refrigerated" : "dry";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function slugId(name: string, index: number): string {
  const base = slugify(name) || "item";
  return `xl-${base}-${index}`;
}

function walk(
  nodes: CatalogNode[],
  acc: CatalogItem[],
  section: string,
  sub: string,
) {
  for (const node of nodes) {
    if (node.items) {
      for (const item of node.items) {
        acc.push({
          ...item,
          category: item.category || section,
          subcategory: item.subcategory || node.name || sub,
        });
      }
    }
    if (node.subcategories) {
      walk(node.subcategories, acc, section, node.name);
    }
  }
}

function flattenCatalog(): CatalogItem[] {
  const items: CatalogItem[] = [];
  const categories = (catalog as { categories: CatalogNode[] }).categories ?? [];
  for (const cat of categories) {
    walk(cat.subcategories ?? [], items, cat.name, cat.name);
  }
  return items;
}

/** Aisle ids that come from Fresh Food rows in the Excel catalog. */
export function getFreshFoodAisleIds(): Set<string> {
  const ids = new Set<string>();
  const categories = (catalog as { categories: CatalogNode[] }).categories ?? [];
  for (const cat of categories) {
    if (!FRESH_FOOD_LABELS.has(cat.name.trim().toLowerCase())) continue;
    for (const sub of cat.subcategories ?? []) {
      const id = slugify(sub.name);
      if (id) ids.add(id);
    }
  }
  return ids;
}

let cached: MenuItem[] | null = null;

export function getCatalogMenuItems(): MenuItem[] {
  if (cached) return cached;
  cached = flattenCatalog().map((item, index) => {
    const sectionLabel = item.category;
    const storeSection = catalogStoreSection(sectionLabel);
    const subcategory = consolidateSubcategory(
      item.subcategory ?? sectionLabel,
    );
    const aisleId = slugify(subcategory) || "other";
    const rawImage =
      item.image &&
      (item.image.startsWith("http") || item.image.startsWith("/images/")) &&
      !item.image.includes("…") &&
      !item.image.includes("...")
        ? item.image
        : undefined;
    const resolved = resolveProductImage({
      name: item.name,
      category: aisleId,
      image: rawImage,
    });
    // Prefer real retail photos only; never keep Unsplash / placehold / aisle stock.
    const image =
      resolved && !isGenericImageUrl(resolved) ? resolved : undefined;
    const brand = cleanBrand(item.brand);
    const nameAlt = cleanBrand(item.nameAlt);
    const name = cleanProductName(item.name, {
      brand: brand ?? nameAlt,
      subcategory,
    });
    const priceOnRequest = Boolean(item.priceOnRequest) || !(item.price > 0);

    return {
      id: slugId(item.name, index),
      name,
      category: aisleId,
      storeSection,
      campus: "cuhk" as const,
      price: priceOnRequest ? 0 : item.price,
      unit: "each",
      image,
      priceType: "fixed" as const,
      runnerInputsPrice: priceOnRequest,
      inStock: item.isAvailable !== false,
      sortOrder: index,
      weightKg: item.weight ?? 0.2,
      subcategory,
      itemNote: nameAlt ?? brand,
      bulkDealPrice: item.bulkDealPrice,
      bulkDealQty: item.bulkDealQty,
    };
  });
  return cached;
}
