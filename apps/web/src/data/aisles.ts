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
      seen.add(id);
      out.push({
        id,
        label: sub.name,
        section,
        menuCategories: [id as MenuCategory],
      });
    }
  }

  return out;
}

export const REFRIGERATED_AISLES: Aisle[] = aislesFromCatalog("refrigerated");
export const DRY_AISLES: Aisle[] = aislesFromCatalog("dry");

export const SECTION_META: Record<
  StoreSection,
  { title: string; subtitle: string }
> = {
  refrigerated: {
    title: "Fresh Food",
    subtitle: "Chilled & refrigerated goods",
  },
  dry: {
    title: "Groceries",
    subtitle: "Pantry & shelf-stable goods",
  },
};

export function getAislesForSection(section: StoreSection): Aisle[] {
  return section === "refrigerated" ? REFRIGERATED_AISLES : DRY_AISLES;
}

export function getAisle(section: StoreSection, aisleId: string): Aisle | undefined {
  return getAislesForSection(section).find((a) => a.id === aisleId);
}

export function isValidSection(section: string): section is StoreSection {
  return section === "refrigerated" || section === "dry";
}

export function refrigeratedAisleIds(): Set<string> {
  return new Set(REFRIGERATED_AISLES.map((a) => a.id));
}
