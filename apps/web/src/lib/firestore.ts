import { collection, getDocs, query, where } from "firebase/firestore";
import { getAisle, type StoreSection } from "@/data/aisles";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  categorySlug,
  firestoreProductToMenuItem,
} from "@/lib/firestore-products";
import { categoryLabel, type MenuItem } from "@/lib/types";

const PRODUCTS = "products";

/** Aisle id → Firestore `category` field values (display labels). */
export const AISLE_FIRESTORE_CATEGORIES: Record<string, string[]> = {
  meat: ["Meat", "Beef & Lamb", "Poultry", "Pork"],
  "household-essentials": ["Household Essentials"],
  snacks: ["Snacks"],
  drinks: ["Drinks"],
  "instant-noodles": ["Instant Noodles", "Instant Meals"],
  seafood: ["Seafood"],
  "dairy-eggs": ["Dairy & Eggs", "Tofu & Protein"],
  frozen: ["Frozen"],
  bread: ["Bread & Bakery", "Bread"],
  "rice-noodles": ["Rice & Noodles"],
  condiments: ["Condiments"],
  "coffee-tea": ["Coffee & Tea"],
  toiletries: ["Toiletries"],
  "fruit-veg": ["Fruit & Vegetables"],
};

export function getFirestoreCategoriesForAisle(aisleId: string): string[] {
  const mapped = AISLE_FIRESTORE_CATEGORIES[aisleId];
  if (mapped) return mapped;
  const label = categoryLabel(aisleId);
  return label ? [label] : [];
}

function mapDocs(
  docs: { id: string; data: () => Record<string, unknown> }[],
): MenuItem[] {
  return docs
    .map((doc) => firestoreProductToMenuItem(doc.id, doc.data()))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function productBelongsToAisle(
  item: MenuItem,
  aisleId: string,
  section: StoreSection,
): boolean {
  const cat = categorySlug(item.category);
  const allowed = new Set(
    getFirestoreCategoriesForAisle(aisleId).map(categorySlug),
  );
  allowed.add(aisleId);

  const aisle = getAisle(section, aisleId);
  for (const menuCat of aisle?.menuCategories ?? []) {
    allowed.add(menuCat);
  }

  if (allowed.has(cat)) return true;

  if (aisleId === "meat") {
    return /meat|beef|lamb|pork|poultry|chicken/.test(cat);
  }
  if (aisleId === "household-essentials") {
    return cat.includes("household") || cat.includes("toiletries");
  }
  return false;
}

/** Load the full Firestore catalog. */
export async function loadAllProducts(): Promise<MenuItem[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(collection(getDb(), PRODUCTS));
  return mapDocs(snap.docs);
}

export function filterProductsForAisle(
  items: MenuItem[],
  section: StoreSection,
  aisleId: string,
): MenuItem[] {
  return items.filter((item) => productBelongsToAisle(item, aisleId, section));
}

/** Fetch products whose Firestore `category` equals the given label. */
export async function getProductsByCategory(
  category: string,
): Promise<MenuItem[]> {
  if (!isFirebaseConfigured() || !category) return [];

  const snap = await getDocs(
    query(collection(getDb(), PRODUCTS), where("category", "==", category)),
  );
  return mapDocs(snap.docs);
}

/**
 * Fetch products for a browse aisle.
 * Loads the catalog with getDocs(), then filters by aisle client-side so a
 * missing Firestore `in` index cannot empty the page.
 */
export async function getProductsForAisle(
  aisleId: string,
  section: StoreSection,
): Promise<MenuItem[]> {
  const all = await loadAllProducts();
  return filterProductsForAisle(all, section, aisleId);
}
