import {
  CHILLED_DRINK_IDS,
  getAisle,
  type StoreSection,
} from "@/data/aisles";
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

  if (aisle.id === "drinks") {
    return allItems.filter(
      (item) =>
        item.category === "drinks" && !CHILLED_DRINK_IDS.includes(item.id),
    );
  }

  if (!aisle.menuCategories?.length) return [];

  return allItems.filter((item) =>
    aisle.menuCategories!.some((cat) => cat === item.category),
  );
}

export function searchItems(items: MenuItem[], query: string): MenuItem[] {
  return filterItemsByQuery(items, query);
}
