import menuData from "../data/menu.json";
import { imageForItem } from "./product-images";
import { resolveProductImage } from "./resolve-image";
import { collectionName } from "./app-env";
import { getDb, isFirebaseConfigured } from "./firebase";
import type { MenuCategory, MenuItem, PriceType } from "./types";
import { collection, getDocs } from "firebase/firestore";

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
    image:
      resolveProductImage({
        id: raw.id,
        name: raw.name,
        image: raw.image,
      }) ?? imageForItem(raw.id, category),
    priceType: raw.priceType ?? "fixed",
    priceRange: raw.priceRange,
    runnerInputsPrice: raw.runnerInputsPrice ?? false,
    itemNote: raw.itemNote,
    inStock: true,
    sortOrder: categorySortCounters[category],
    weightKg: raw.weightKg ?? 0.2,
  };
}

export const MENU_ITEMS: MenuItem[] = (menuData.items as RawMenuItem[]).map(
  normalizeItem,
);

export function getMenuItemsByCategory(category: MenuCategory): MenuItem[] {
  return MENU_ITEMS.filter((item) => item.category === category);
}

export function getMenuItemById(id: string): MenuItem | undefined {
  return MENU_ITEMS.find((item) => item.id === id);
}

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

const DEFAULT_WEB_ORIGIN = "https://gracerun.vercel.app";

export function webAssetOrigin(): string {
  const fromEnv =
    (typeof process !== "undefined" &&
      (process.env.EXPO_PUBLIC_WEB_ORIGIN ||
        process.env.NEXT_PUBLIC_SITE_URL)) ||
    DEFAULT_WEB_ORIGIN;
  return fromEnv.replace(/\/$/, "");
}

/** Turn `/images/...` into an absolute URL for React Native Image. */
export function resolveProductImageUrl(image: string | undefined): string {
  if (!image) return "";
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("/")) return `${webAssetOrigin()}${image}`;
  return image;
}

let cachedItems: MenuItem[] | null = null;

function parseFirestoreItem(data: Record<string, unknown>): MenuItem {
  const id = String(data.id);
  const category = data.category as MenuItem["category"];
  return {
    id,
    name: String(data.name),
    category,
    price: Number(data.price),
    salePrice: data.salePrice != null ? Number(data.salePrice) : undefined,
    bulkDealQty: data.bulkDealQty != null ? Number(data.bulkDealQty) : undefined,
    bulkDealPrice:
      data.bulkDealPrice != null ? Number(data.bulkDealPrice) : undefined,
    unit: String(data.unit ?? "each"),
    image:
      resolveProductImage({
        id,
        name: String(data.name),
        image: data.image ? String(data.image) : undefined,
      }) ?? imageForItem(id, category),
    priceType: (data.priceType as MenuItem["priceType"]) ?? "fixed",
    priceRange: data.priceRange ? String(data.priceRange) : undefined,
    runnerInputsPrice: Boolean(data.runnerInputsPrice),
    itemNote: data.itemNote ? String(data.itemNote) : undefined,
    inStock: data.inStock !== false,
    sortOrder: Number(data.sortOrder ?? 0),
    weightKg: data.weightKg != null ? Number(data.weightKg) : 0.2,
  };
}

export async function loadMenuItems(): Promise<MenuItem[]> {
  if (cachedItems) return cachedItems;

  if (isFirebaseConfigured()) {
    try {
      const snap = await getDocs(collection(getDb(), collectionName("menu")));
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

export function filterItemsByQuery(items: MenuItem[], query: string): MenuItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => item.name.toLowerCase().includes(q));
}
