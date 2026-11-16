import type { CartItem, MenuItem } from "@fusion-express/shared/types";
import {
  restaurantIdFromCanteenItemId,
  restaurantIdFromOrderItems,
} from "@fusion-express/shared/canteen-college";
import {
  CANTEEN_DELIVERY_FEE,
  type RestaurantId,
} from "./restaurants";

const PREFIX = "canteen:";

export type CanteenDish = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
};

export function isCanteenItemId(id: string): boolean {
  return id.startsWith(PREFIX);
}

export function isCanteenCart(items: CartItem[]): boolean {
  return items.some((c) => isCanteenItemId(c.item.id));
}

export function isGroceryCart(items: CartItem[]): boolean {
  return items.length > 0 && !isCanteenCart(items);
}

export function canteenDeliveryFeeHkd(items: CartItem[]): number {
  return isCanteenCart(items) ? CANTEEN_DELIVERY_FEE : 0;
}

export function cartRestaurantId(items: CartItem[]): string | null {
  return restaurantIdFromOrderItems(
    items.map((c) => ({ itemId: c.item.id })),
  );
}

export function toCanteenMenuItem(
  dish: CanteenDish,
  restaurantId: RestaurantId | string,
): MenuItem {
  return {
    id: `${PREFIX}${restaurantId}:${dish.id}`,
    name: dish.name,
    category: "other",
    price: dish.price,
    unit: "each",
    image: dish.image,
    priceType: "fixed",
    runnerInputsPrice: false,
    inStock: true,
    sortOrder: 0,
    weightKg: 0.4,
    itemNote: dish.description,
  };
}

export { restaurantIdFromCanteenItemId, CANTEEN_DELIVERY_FEE };
