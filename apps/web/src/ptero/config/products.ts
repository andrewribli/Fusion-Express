import catalog from "@/ptero/data/taste-citygate-catalog.json";
import { CAMPUS_ID, type CampusId } from "@/ptero/config/campus";
import {
  CATEGORY_LABELS,
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from "@/ptero/config/categories";
import type { MenuItem } from "@/ptero/lib/types";

export {
  CATEGORY_LABELS,
  PRODUCT_CATEGORIES,
  SIDEBAR_CATEGORIES,
  type ProductCategory,
  type SidebarCategoryId,
} from "@/ptero/config/categories";

type CatalogItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  unit?: string;
  image?: string;
  weightKg?: number;
  sortOrder?: number;
  salePrice?: number;
  description?: string;
};

function toMenuItem(raw: CatalogItem, index: number): MenuItem {
  return {
    id: raw.id,
    campus: CAMPUS_ID as CampusId,
    name: raw.name,
    category: raw.category,
    price: raw.price,
    salePrice: raw.salePrice,
    unit: raw.unit || "each",
    image: raw.image || undefined,
    description: raw.description,
    priceType: "fixed",
    runnerInputsPrice: false,
    inStock: true,
    sortOrder: raw.sortOrder ?? index + 1,
    weightKg: raw.weightKg ?? 0.35,
  };
}

/**
 * Taste Citygate catalog scraped from Foodpanda
 * (https://www.foodpanda.hk/shop/pql9/taste-citygate), with thin aisles
 * topped up from prior Foodpanda Fusion-Taste-PNS scrapes.
 */
export const TASTE_PRODUCTS: MenuItem[] = (
  (catalog as { items: CatalogItem[] }).items ?? []
).map(toMenuItem);

export function getProduct(id: string): MenuItem | undefined {
  return TASTE_PRODUCTS.find((p) => p.id === id);
}

export function productsByCategory(category: string): MenuItem[] {
  return TASTE_PRODUCTS.filter((p) => p.category === category);
}

export function searchProducts(query: string): MenuItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return TASTE_PRODUCTS.filter((p) => p.name.toLowerCase().includes(q));
}

export function recommendedProducts(): MenuItem[] {
  return TASTE_PRODUCTS.filter((p) => p.image).slice(0, 16);
}

export const TASTE_CATALOG_META = {
  source: (catalog as { source?: string }).source,
  storeName: (catalog as { storeName?: string }).storeName,
  itemCount: TASTE_PRODUCTS.length,
  byCategory: (catalog as { byCategory?: Record<string, number> }).byCategory,
};
