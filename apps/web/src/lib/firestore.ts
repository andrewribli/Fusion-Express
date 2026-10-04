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
  produce: [
    "Produce",
    "produce",
    "Fruit",
    "fruit",
    "Fruit & Berries",
    "fruit-and-berries",
    "Vegetables",
    "vegetables",
  ],
  "meat-beef": ["Meat - Beef", "meat-beef", "Beef", "beef"],
  "meat-chicken": ["Meat - Chicken", "meat-chicken", "Chicken", "chicken"],
  "meat-pork": ["Meat - Pork", "meat-pork", "Pork", "pork"],
  "meat-other": [
    "Meat - Other",
    "meat-other",
    "Meat",
    "meat",
    "Others",
    "others",
  ],
  seafood: ["Seafood", "seafood"],
  milk: ["Milk", "milk", "Dairy", "dairy"],
  cheese: ["Cheese", "cheese"],
  yogurt: ["Yogurt", "yogurt"],
  "butter-and-spreads": ["Butter & Spreads", "butter-and-spreads"],
  eggs: ["Eggs", "eggs"],
  "ready-to-cook": ["Ready to Cook", "ready-to-cook"],
  "frozen-meals": ["Frozen Meals", "frozen-meals", "Frozen Food", "frozen-food"],
  "frozen-meat": ["Frozen Meat", "frozen-meat"],
  "frozen-vegetables": ["Frozen Vegetables", "frozen-vegetables"],
  seasonings: ["Seasonings", "seasonings"],
  "tea-and-coffee": ["Tea & Coffee", "tea-and-coffee", "Tea", "tea", "Hot Drinks", "hot-drinks"],
  toiletries: ["Toiletries", "toiletries"],
  noodles: ["Noodles", "noodles", "Instant Noodles", "instant-noodles"],
  "rice-and-grains": [
    "Rice & Grains",
    "rice-and-grains",
    "Rice & Noodles",
    "rice-noodles",
    "Pantry",
    "pantry",
  ],
  condiments: ["Condiments", "condiments", "Sauces", "sauces", "Pickles", "pickles"],
  cleaning: [
    "Cleaning",
    "cleaning",
    "Cleaning Supplies",
    "cleaning-supplies",
    "Household",
    "household",
    "Household Essentials",
  ],
  "canned-goods": ["Canned Goods", "canned-goods"],
  snacks: [
    "Snacks",
    "snacks",
    "Chips",
    "chips",
    "Biscuits",
    "biscuits",
    "Crackers",
    "crackers",
    "Confectionary",
    "confectionary",
  ],
  // Legacy ids kept for old browse URLs
  tea: ["Tea", "tea", "Tea & Coffee", "tea-and-coffee"],
  "instant-noodles": ["Instant Noodles", "instant-noodles", "Noodles", "noodles"],
  "fruit-and-berries": ["Fruit & Berries", "fruit-and-berries", "Produce", "produce"],
  household: ["Household", "household", "Cleaning", "cleaning"],
  sauces: ["Sauces", "sauces", "Condiments", "condiments"],
  "rice-noodles": ["Rice & Noodles", "rice-noodles", "Rice & Grains", "rice-and-grains"],
  chips: ["Chips", "chips", "Snacks", "snacks"],
  pickles: ["Pickles", "pickles", "Condiments", "condiments"],
  crackers: ["Crackers", "crackers", "Snacks", "snacks"],
  biscuits: ["Biscuits", "biscuits", "Snacks", "snacks"],
  "cleaning-supplies": ["Cleaning Supplies", "cleaning-supplies", "Cleaning", "cleaning"],
  beef: ["Beef", "beef", "Meat - Beef", "meat-beef"],
  chicken: ["Chicken", "chicken", "Meat - Chicken", "meat-chicken"],
  pork: ["Pork", "pork", "Meat - Pork", "meat-pork"],
  meat: ["Meat", "meat", "Meat - Other", "meat-other"],
  others: ["Others", "others", "Meat - Other", "meat-other"],
  dairy: ["Dairy", "dairy", "Milk", "milk"],
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

  const aisle = getAisle(section, aisleId);
  const resolvedId = aisle?.id ?? aisleId;

  const cat = categorySlug(item.category);
  if (cat === resolvedId || cat === aisleId) return true;

  const allowed = new Set(
    getFirestoreCategoriesForAisle(resolvedId).map(categorySlug),
  );
  allowed.add(resolvedId);
  allowed.add(aisleId);

  for (const menuCat of aisle?.menuCategories ?? []) {
    allowed.add(categorySlug(menuCat));
  }

  const snackHub = new Set([
    "snacks",
    "chips",
    "biscuits",
    "crackers",
    "confectionary",
  ]);
  const produceHub = new Set([
    "produce",
    "fruit",
    "fruit-and-berries",
    "vegetables",
  ]);
  const sub = item.subcategory
    ? categorySlug(item.subcategory).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    : "";
  if (resolvedId === "snacks" && (snackHub.has(cat) || snackHub.has(sub))) {
    return true;
  }
  if (resolvedId === "produce" && (produceHub.has(cat) || produceHub.has(sub))) {
    return true;
  }

  if (allowed.has(cat)) return true;
  return sub === resolvedId || sub === aisleId || allowed.has(sub);
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
