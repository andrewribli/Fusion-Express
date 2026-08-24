import { MENU_ITEMS } from "@/data/menu-items";
import {
  CHILLED_DRINK_IDS,
  getAisle,
  type StoreSection,
} from "@/data/aisles";
import type { MenuItem } from "@/lib/types";
import { collection, getDocs } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";

let cachedItems: MenuItem[] | null = null;

function parseFirestoreItem(data: Record<string, unknown>): MenuItem {
  return {
    id: String(data.id),
    name: String(data.name),
    category: data.category as MenuItem["category"],
    price: Number(data.price),
    salePrice: data.salePrice != null ? Number(data.salePrice) : undefined,
    bulkDealQty: data.bulkDealQty != null ? Number(data.bulkDealQty) : undefined,
    bulkDealPrice:
      data.bulkDealPrice != null ? Number(data.bulkDealPrice) : undefined,
    unit: String(data.unit ?? "each"),
    image: data.image ? String(data.image) : undefined,
    priceType: (data.priceType as MenuItem["priceType"]) ?? "fixed",
    priceRange: data.priceRange ? String(data.priceRange) : undefined,
    runnerInputsPrice: Boolean(data.runnerInputsPrice),
    itemNote: data.itemNote ? String(data.itemNote) : undefined,
    inStock: data.inStock !== false,
    sortOrder: Number(data.sortOrder ?? 0),
    weightKg: data.weightKg != null ? Number(data.weightKg) : 0.2,
  };
}

/** Load menu from Firestore `menu` collection, fallback to static JSON */
export async function loadMenuItems(): Promise<MenuItem[]> {
  if (cachedItems) return cachedItems;

  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(getDb(), "menu"));
      if (!snap.empty) {
        cachedItems = snap.docs.map((doc) =>
          parseFirestoreItem(doc.data() as Record<string, unknown>),
        );
        return cachedItems;
      }
    } catch {
      // fall through to static menu
    }
  }

  cachedItems = MENU_ITEMS;
  return cachedItems;
}

export function getStaticMenuItems(): MenuItem[] {
  return MENU_ITEMS;
}

export function getMenuItemById(itemId: string): MenuItem | undefined {
  return MENU_ITEMS.find((item) => item.id === itemId);
}

export function getAisleItems(
  allItems: MenuItem[],
  section: StoreSection,
  aisleId: string,
): MenuItem[] {
  const aisle = getAisle(section, aisleId);
  if (!aisle) return [];

  if (aisle.itemIds && aisle.itemIds.length > 0) {
    return allItems.filter((item) => aisle.itemIds!.includes(item.id));
  }

  if (aisle.id === "drinks") {
    return allItems.filter(
      (item) =>
        item.category === "drinks" && !CHILLED_DRINK_IDS.includes(item.id),
    );
  }

  if (!aisle.menuCategories?.length) return [];

  return allItems.filter((item) =>
    aisle.menuCategories!.includes(item.category),
  );
}

export function searchItems(items: MenuItem[], query: string): MenuItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => item.name.toLowerCase().includes(q));
}
