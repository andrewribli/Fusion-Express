import type { MenuCategory } from "@/lib/types";

export type StoreSection = "refrigerated" | "dry";

export interface Aisle {
  id: string;
  label: string;
  section: StoreSection;
  /** Match items by Firestore/menu category */
  menuCategories?: MenuCategory[];
  /** Match specific item IDs (e.g. split drinks aisle) */
  itemIds?: string[];
}

/** Drinks typically sold from fridges at Fusion */
export const CHILLED_DRINK_IDS = [
  "pocari-sweat",
  "pocari-sweat-largest",
  "pagoda-kumquat-lemon-bundle",
  "pagoda-kumquat-lemon",
  "tao-ti-mandarin-lemon",
  "fanta-mini-6pack-orange",
  "vitasoy-original",
  "vitasoy-chocolate",
  "minute-maid-orange",
  "minute-maid-apple",
  "lipton-lemon",
  "lipton-peach",
  "yakult",
  "milk-kowloon",
  "milk-meiji",
];

export const REFRIGERATED_AISLES: Aisle[] = [
  { id: "meat", label: "Meat & Poultry", section: "refrigerated", menuCategories: ["meat"] },
  { id: "seafood", label: "Seafood", section: "refrigerated", menuCategories: ["seafood"] },
  { id: "dairy-eggs", label: "Dairy & Eggs", section: "refrigerated", menuCategories: ["dairy-eggs", "tofu-protein"] },
  { id: "frozen", label: "Frozen Food", section: "refrigerated", menuCategories: ["frozen"] },
  { id: "chilled-drinks", label: "Chilled Drinks", section: "refrigerated", itemIds: CHILLED_DRINK_IDS },
  { id: "salads", label: "Pre-packed Salads", section: "refrigerated", menuCategories: [] },
];

export const DRY_AISLES: Aisle[] = [
  { id: "instant-noodles", label: "Instant Noodles", section: "dry", menuCategories: ["instant-noodles", "instant-meals"] },
  { id: "drinks", label: "Drinks (Shelf-stable)", section: "dry", menuCategories: ["drinks"], itemIds: [] },
  { id: "snacks", label: "Snacks & Chips", section: "dry", menuCategories: ["snacks"] },
  { id: "bread", label: "Bread & Bakery", section: "dry", menuCategories: ["bread"] },
  { id: "rice-noodles", label: "Rice & Noodles", section: "dry", menuCategories: ["rice-noodles"] },
  { id: "canned-goods", label: "Canned Goods", section: "dry", menuCategories: [] },
  { id: "condiments", label: "Condiments & Sauces", section: "dry", menuCategories: ["condiments"] },
  { id: "coffee-tea", label: "Coffee & Tea", section: "dry", menuCategories: ["coffee-tea"] },
  { id: "toiletries", label: "Toiletries & Essentials", section: "dry", menuCategories: ["toiletries"] },
  { id: "fruit-veg", label: "Fruits & Vegetables", section: "dry", menuCategories: ["fruit-veg"] },
];

export const SECTION_META: Record<
  StoreSection,
  { title: string; subtitle: string }
> = {
  refrigerated: {
    title: "Refrigerated Section",
    subtitle: "Chilled & Frozen Goods",
  },
  dry: {
    title: "Non-Refrigerated Section",
    subtitle: "Pantry & Dry Goods",
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
