import { collection, getDocs, query, where } from "firebase/firestore";
import { getAisle, type StoreSection } from "@/data/aisles";
import { getCatalogMenuItems } from "@/lib/catalog-products";
import { collectionName, isStagingApp } from "@/lib/constants";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  categorySlug,
  firestoreProductToMenuItem,
} from "@/lib/firestore-products";
import { categoryLabel, type MenuItem } from "@/lib/types";

const PRODUCTS = collectionName("products");
const PRODUCTS_PROD = "products";

/** Aisle id → category field values (Excel Sub-Category + legacy labels). */
export const AISLE_FIRESTORE_CATEGORIES: Record<string, string[]> = {
  seasonings: ["Seasonings", "seasonings"],
  tea: ["Tea", "tea"],
  toiletries: ["Toiletries", "toiletries"],
  "instant-noodles": ["Instant Noodles", "instant-noodles"],
  condiments: ["Condiments", "condiments"],
  household: ["Household", "household", "Household Essentials"],
  "canned-goods": ["Canned Goods", "canned-goods"],
  sauces: ["Sauces", "sauces"],
  "rice-noodles": ["Rice & Noodles", "rice-noodles"],
  chips: ["Chips", "chips"],
  pickles: ["Pickles", "pickles"],
  crackers: ["Crackers", "crackers"],
  biscuits: ["Biscuits", "biscuits"],
  "cleaning-supplies": ["Cleaning Supplies", "cleaning-supplies"],
  snacks: ["Snacks", "snacks"],
  other: ["Other", "other"],
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
  if (item.storeSection && item.storeSection !== section) return false;

  const cat = categorySlug(item.category);
  if (cat === aisleId) return true;

  const allowed = new Set(
    getFirestoreCategoriesForAisle(aisleId).map(categorySlug),
  );
  allowed.add(aisleId);

  const aisle = getAisle(section, aisleId);
  for (const menuCat of aisle?.menuCategories ?? []) {
    allowed.add(menuCat);
  }

  if (allowed.has(cat)) return true;

  const sub = item.subcategory ? categorySlug(item.subcategory) : "";
  return sub === aisleId;
}

/**
 * Load the Excel-backed catalog bundled with the app.
 * Firestore products are not merged so gracerun.fit (old deploy) stays on the
 * previous catalog while vercel.app can test this sheet in isolation.
 */
export async function loadAllProducts(): Promise<MenuItem[]> {
  const catalog = getCatalogMenuItems();
  console.log("[products] using Excel catalog JSON,", catalog.length, "items");
  return catalog;
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

  let snap = await getDocs(
    query(collection(getDb(), PRODUCTS), where("category", "==", category)),
  );
  if (snap.empty && isStagingApp() && PRODUCTS !== PRODUCTS_PROD) {
    snap = await getDocs(
      query(collection(getDb(), PRODUCTS_PROD), where("category", "==", category)),
    );
  }
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
