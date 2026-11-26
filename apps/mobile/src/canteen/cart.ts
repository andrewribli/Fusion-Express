import type { CartItem, MenuItem } from "@fusion-express/shared/types";
import {
  restaurantIdFromCanteenItemId,
  restaurantIdFromOrderItems,
} from "@fusion-express/shared/canteen-college";
import type { MenuOptionGroup } from "@fusion-express/shared/canteen-set-options";
import {
  labelForSelections,
  priceDeltaForSelections,
  variantIdSuffix,
  type SelectedOptions,
} from "@fusion-express/shared/canteen-set-options";
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
  optionGroups?: MenuOptionGroup[];
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

/** True when the cart has both canteen and Fusion grocery lines. */
export function isMixedCart(items: CartItem[]): boolean {
  let canteen = false;
  let grocery = false;
  for (const line of items) {
    if (isCanteenItemId(line.item.id)) canteen = true;
    else grocery = true;
    if (canteen && grocery) return true;
  }
  return false;
}

/** Canteen-only cart (non-empty, no grocery lines). */
export function isPureCanteenCart(items: CartItem[]): boolean {
  return items.length > 0 && isCanteenCart(items) && !isMixedCart(items);
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

export function toConfiguredCanteenMenuItem(
  dish: CanteenDish,
  restaurantId: RestaurantId | string,
  selected: SelectedOptions,
): MenuItem {
  const base = toCanteenMenuItem(dish, restaurantId);
  const groups = dish.optionGroups;
  if (!groups?.length) return base;
  const extra = priceDeltaForSelections(groups, selected);
  const label = labelForSelections(groups, selected);
  const suffix = variantIdSuffix(selected);
  return {
    ...base,
    id: `${base.id}::${suffix}`,
    name: label ? `${dish.name} (${label})` : dish.name,
    price: dish.price + extra,
    itemNote: [dish.description, label ? `Options: ${label}` : null]
      .filter(Boolean)
      .join(" · "),
  };
}

export { restaurantIdFromCanteenItemId, CANTEEN_DELIVERY_FEE };
