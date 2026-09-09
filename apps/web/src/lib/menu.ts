import {
  getAisle,
  getAislesForSection,
  type StoreSection,
} from "@/data/aisles";
import { productBelongsToAisle } from "@/lib/firestore";
import type { MenuItem } from "@/lib/types";
import {
  filterItemsByQuery,
  getMenuItemById as getStaticMenuItemById,
  getStaticMenuItems,
  loadMenuItems,
} from "@fusion-express/shared/products";

export { loadMenuItems, getStaticMenuItems };

export function getMenuItemById(itemId: string): MenuItem | undefined {
  return getStaticMenuItemById(itemId);
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

  return allItems.filter((item) =>
    productBelongsToAisle(item, aisleId, section),
  );
}

export function getSectionItems(
  allItems: MenuItem[],
  section: StoreSection,
): MenuItem[] {
  const seen = new Set<string>();
  const out: MenuItem[] = [];
  for (const aisle of getAislesForSection(section)) {
    for (const item of getAisleItems(allItems, section, aisle.id)) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

export function searchItems(items: MenuItem[], query: string): MenuItem[] {
  return filterItemsByQuery(items, query);
}
