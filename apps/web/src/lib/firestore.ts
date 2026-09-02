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

/** Aisle id → Firestore `category` field values (display labels). */
export const AISLE_FIRESTORE_CATEGORIES: Record<string, string[]> = {
  meat: ["Meat", "Beef & Lamb", "Poultry", "Pork", "Meat & Seafood"],
  "household-essentials": ["Household Essentials"],
  snacks: ["Snacks"],
  drinks: ["Drinks"],
  "instant-noodles": [
    "Instant Noodles",
    "Instant Meals",
    "Instant Noodles & Pasta",
  ],
  seafood: ["Seafood"],
  "dairy-eggs": ["Dairy & Eggs", "Tofu & Protein"],
  frozen: ["Frozen", "Frozen Foods"],
  "chilled-drinks": ["Chilled Drinks"],
  salads: ["Salads", "Pre-packed Salads"],
  bread: ["Bread & Bakery", "Bread", "Bakery & Bread"],
  "rice-noodles": ["Rice & Noodles"],
  "canned-goods": ["Canned & Packaged Goods", "Canned Goods"],
  condiments: ["Condiments"],
  "coffee-tea": ["Coffee & Tea"],
  toiletries: ["Toiletries", "Personal Care"],
  "fruit-veg": ["Fruit & Vegetables", "Fruits & Vegetables"],
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
    return cat.includes("household");
  }
  if (aisleId === "instant-noodles") {
    return /instant-noodle|pasta|ramen/.test(cat);
  }
  if (aisleId === "canned-goods") {
    return cat.includes("canned") || cat.includes("packaged");
  }
  if (aisleId === "bread") {
    return cat.includes("bread") || cat.includes("bakery");
  }
  if (aisleId === "salads") {
    return cat.includes("salad");
  }
  if (aisleId === "chilled-drinks") {
    return cat.includes("chilled");
  }
  if (aisleId === "coffee-tea") {
    return cat.includes("coffee") || cat.includes("tea");
  }
  if (aisleId === "condiments") {
    return cat.includes("condiment") || cat.includes("sauce");
  }
  if (aisleId === "rice-noodles") {
    return cat.includes("rice") && !cat.includes("instant");
  }
  if (aisleId === "seafood") {
    return cat.includes("seafood");
  }
  if (aisleId === "frozen") {
    return cat.includes("frozen");
  }
  return false;
}

/** Load the full Firestore catalog. */
export async function loadAllProducts(): Promise<MenuItem[]> {
  const catalog = getCatalogMenuItems();
  if (!isFirebaseConfigured()) {
    console.log("[products] Firebase is not configured — using catalog JSON");
    return catalog;
  }
  const db = getDb();
  console.log("[products] querying collection(db, \"" + PRODUCTS + "\")");
  let snap = await getDocs(collection(db, PRODUCTS));
  if (snap.empty && isStagingApp() && PRODUCTS !== PRODUCTS_PROD) {
    snap = await getDocs(collection(db, PRODUCTS_PROD));
  }
  console.log("[products] fetched", snap.size, "docs");
  const fromFirestore = mapDocs(snap.docs);
  const seen = new Set(fromFirestore.map((item) => item.name.toLowerCase()));
  const extras = catalog.filter((item) => !seen.has(item.name.toLowerCase()));
  return [...fromFirestore, ...extras].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );
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
