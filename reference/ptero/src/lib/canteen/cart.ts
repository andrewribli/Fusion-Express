import { CAMPUS_ID } from "@/config/campus";
import {
  getCanteenMenuItem,
  type CanteenMenuItem,
} from "@/config/canteen/menus";
import {
  CANTEEN_DELIVERY_FEE,
  getRestaurant,
  type RestaurantId,
} from "@/config/canteen/restaurants";
import type { CartItem, MenuItem } from "@/lib/types";

const CANTEEN_PREFIX = "canteen:";

/** Cart / order item id = `canteen:{restaurantId}:{itemId}` — same as CUHK. */
export function canteenItemId(restaurantId: string, itemId: string): string {
  return `${CANTEEN_PREFIX}${restaurantId}:${itemId}`;
}

export function isCanteenItemId(id: string): boolean {
  return id.startsWith(CANTEEN_PREFIX);
}

export function parseCanteenItemId(
  id: string,
): { restaurantId: string; itemId: string } | null {
  if (!isCanteenItemId(id)) return null;
  const rest = id.slice(CANTEEN_PREFIX.length);
  const idx = rest.indexOf(":");
  if (idx <= 0) return null;
  return {
    restaurantId: rest.slice(0, idx),
    itemId: rest.slice(idx + 1),
  };
}

export function restaurantIdFromCanteenItemId(itemId: string): string | null {
  return parseCanteenItemId(itemId)?.restaurantId ?? null;
}

export function isCanteenCart(items: CartItem[]): boolean {
  return items.length > 0 && items.every((c) => isCanteenItemId(c.item.id));
}

export function canteenDeliveryFeeHkd(): number {
  return CANTEEN_DELIVERY_FEE;
}

export function toCartMenuItem(
  restaurantId: RestaurantId | string,
  menuItem: CanteenMenuItem,
): MenuItem {
  const restaurant = getRestaurant(restaurantId);
  return {
    id: canteenItemId(restaurantId, menuItem.id),
    campus: CAMPUS_ID,
    name: menuItem.name,
    category: menuItem.category,
    price: menuItem.price,
    unit: "each",
    priceType: "fixed",
    runnerInputsPrice: false,
    inStock: true,
    sortOrder: 0,
    weightKg: 0,
    image: undefined,
    description: menuItem.description,
    restaurantId: restaurantId as RestaurantId,
    restaurantName: restaurant?.shortName ?? restaurantId,
  };
}

export function resolveCanteenMenuItem(cartItemId: string): CanteenMenuItem | null {
  const parsed = parseCanteenItemId(cartItemId);
  if (!parsed) return null;
  return getCanteenMenuItem(parsed.restaurantId, parsed.itemId) ?? null;
}

export function primaryCanteenRestaurantId(
  items: { itemId?: string; id?: string }[],
): string | null {
  for (const row of items) {
    const id = row.itemId ?? row.id;
    if (!id) continue;
    const rid = restaurantIdFromCanteenItemId(id);
    if (rid) return rid;
  }
  return null;
}
