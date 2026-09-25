import type { CartItem, MenuItem } from "@/lib/types";
import type { MenuItem as BfItem } from "@/data/canteen/bf-menu";
import type { SimpleMenuItem } from "@/data/canteen/simple-menu";
import type { UcMenuItem } from "@/data/canteen/uc-menu";
import {
  CANTEEN_DELIVERY_FEE,
  type RestaurantId,
} from "@/data/canteen/restaurants";
import { getCurrentUcPeriod } from "@/lib/canteen/hours";
import { isOrderableCanteen } from "@/lib/canteenConfig";
import { closedBanner, isOpen } from "@/lib/openingHours";
import {
  canteenNameForRestaurant,
  restaurantIdFromCanteenItemId,
} from "@fusion-express/shared/canteen-college";

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

export type CanteenCheckoutGate = {
  allowed: boolean;
  message: string | null;
};

/** Block checkout for stale carts (closed / coming-soon canteens, mixed canteens). */
export function getCanteenCheckoutGate(items: CartItem[]): CanteenCheckoutGate {
  if (!isCanteenCart(items)) {
    return { allowed: true, message: null };
  }

  let restaurantId: string | null = null;
  for (const { item } of items) {
    if (!isCanteenItemId(item.id)) continue;
    const rid = restaurantIdFromCanteenItemId(item.id);
    if (!rid) {
      return {
        allowed: false,
        message: "Some cart items are invalid. Remove them to continue.",
      };
    }
    if (restaurantId && restaurantId !== rid) {
      return {
        allowed: false,
        message:
          "Your cart mixes different canteens. Remove items so everything is from one canteen.",
      };
    }
    restaurantId = rid;
  }

  if (!restaurantId) {
    return { allowed: false, message: "Invalid canteen cart." };
  }

  if (!isOrderableCanteen(restaurantId)) {
    const name = canteenNameForRestaurant(restaurantId);
    return {
      allowed: false,
      message: `${name} isn't accepting orders yet. Remove these items to checkout.`,
    };
  }

  const withinHours =
    restaurantId === "uc-canteen"
      ? Boolean(getCurrentUcPeriod())
      : isOpen(restaurantId);

  if (!withinHours) {
    return {
      allowed: false,
      message:
        closedBanner(restaurantId) ?? "This canteen is closed right now.",
    };
  }

  return { allowed: true, message: null };
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
    image: item.image,
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
