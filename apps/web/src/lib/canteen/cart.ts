import type { CartItem, MenuItem } from "@/lib/types";
import type { MenuItem as BfItem } from "@/data/canteen/bf-menu";
import { canteenFoodImage } from "@/data/canteen/food-images";
import type { SimpleMenuItem } from "@/data/canteen/simple-menu";
import type { UcMenuItem } from "@/data/canteen/uc-menu";
import {
  CANTEEN_DELIVERY_FEE,
  type RestaurantId,
} from "@/data/canteen/restaurants";

function ucImage(item: UcMenuItem): string {
  const c = item.category.toLowerCase();
  const category = /drink|tea|coffee|juice|beverage|soup/.test(c)
    ? "drinks"
    : /dessert|sweet|cake|ice/.test(c)
      ? "dessert"
      : /snack|side|bun|bread|dim/.test(c)
        ? "snacks"
        : "mains";
  return canteenFoodImage(item.id, category);
}

const PREFIX = "canteen:";

export function isCanteenItemId(id: string): boolean {
  return id.startsWith(PREFIX);
}

export function isCanteenCart(items: CartItem[]): boolean {
  return items.some((c) => isCanteenItemId(c.item.id));
}

export function canteenDeliveryFeeHkd(items: CartItem[]): number {
  return isCanteenCart(items) ? CANTEEN_DELIVERY_FEE : 0;
}

export function toCartMenuItemFromBf(
  item: BfItem,
  restaurantId: RestaurantId = "benjamin-franklin",
): MenuItem {
  return {
    id: `${PREFIX}${restaurantId}:${item.id}`,
    name: item.name,
    category: "other",
    price: item.price,
    unit: "each",
    image: item.image,
    priceType: "fixed",
    runnerInputsPrice: false,
    inStock: true,
    sortOrder: 0,
    weightKg: 0.4,
    itemNote: item.description,
  };
}

export function toCartMenuItemFromUc(
  item: UcMenuItem,
  restaurantId: RestaurantId = "uc-canteen",
): MenuItem {
  const name = item.nameZh ? `${item.name} (${item.nameZh})` : item.name;
  return {
    id: `${PREFIX}${restaurantId}:${item.id}`,
    name,
    category: "other",
    price: item.price,
    unit: "each",
    image: ucImage(item),
    priceType: "fixed",
    runnerInputsPrice: false,
    inStock: true,
    sortOrder: 0,
    weightKg: 0.4,
    itemNote: item.description,
  };
}

export function toCartMenuItemFromSimple(
  item: SimpleMenuItem,
  restaurantId: RestaurantId,
): MenuItem {
  return {
    id: `${PREFIX}${restaurantId}:${item.id}`,
    name: item.name,
    category: "other",
    price: item.price,
    unit: "each",
    image: item.image,
    priceType: "fixed",
    runnerInputsPrice: false,
    inStock: true,
    sortOrder: 0,
    weightKg: 0.4,
    itemNote: item.description,
  };
}
