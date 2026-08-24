import menuData from "./menu.json";
import { imageForItem } from "@/data/product-images";
import type { MenuCategory, MenuItem, PriceType } from "@/lib/types";

interface RawMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  salePrice?: number;
  bulkDealQty?: number;
  bulkDealPrice?: number;
  unit: string;
  image?: string;
  priceType?: PriceType;
  priceRange?: string;
  runnerInputsPrice?: boolean;
  itemNote?: string;
  weightKg?: number;
}

const categorySortCounters: Record<string, number> = {};

function normalizeItem(raw: RawMenuItem): MenuItem {
  const category = raw.category as MenuCategory;
  categorySortCounters[category] = (categorySortCounters[category] ?? 0) + 1;

  return {
    id: raw.id,
    name: raw.name,
    category,
    price: raw.price,
    salePrice: raw.salePrice,
    bulkDealQty: raw.bulkDealQty,
    bulkDealPrice: raw.bulkDealPrice,
    unit: raw.unit,
    image: imageForItem(raw.id, category),
    priceType: raw.priceType ?? "fixed",
    priceRange: raw.priceRange,
    runnerInputsPrice: raw.runnerInputsPrice ?? false,
    itemNote: raw.itemNote,
    inStock: true,
    sortOrder: categorySortCounters[category],
    weightKg: raw.weightKg ?? 0.2,
  };
}

/** Full Fusion supermarket menu — source of truth for static UI and Firestore seed */
export const MENU_ITEMS: MenuItem[] = (menuData.items as RawMenuItem[]).map(
  normalizeItem,
);

export function getMenuItemsByCategory(category: MenuCategory): MenuItem[] {
  return MENU_ITEMS.filter((item) => item.category === category);
}

export function getMenuItemById(id: string): MenuItem | undefined {
  return MENU_ITEMS.find((item) => item.id === id);
}

/** Shape written to Firestore `menu` collection */
export function toFirestoreMenuDoc(item: MenuItem) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    salePrice: item.salePrice ?? null,
    bulkDealQty: item.bulkDealQty ?? null,
    bulkDealPrice: item.bulkDealPrice ?? null,
    unit: item.unit,
    image: item.image ?? "",
    priceType: item.priceType,
    priceRange: item.priceRange ?? "",
    runnerInputsPrice: item.runnerInputsPrice,
    itemNote: item.itemNote ?? "",
    inStock: item.inStock,
    sortOrder: item.sortOrder,
    weightKg: item.weightKg,
  };
}
