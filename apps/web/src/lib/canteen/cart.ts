import type { CartItem, MenuItem } from "@/lib/types";
import type { MenuItem as BfItem } from "@/data/canteen/bf-menu";
import type { SimpleMenuItem } from "@/data/canteen/simple-menu";
import type { UcMenuItem } from "@/data/canteen/uc-menu";
import {
  CANTEEN_DELIVERY_FEE,
  type RestaurantId,
} from "@/data/canteen/restaurants";

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
