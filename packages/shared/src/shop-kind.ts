/** Which merchant vertical an order / cart belongs to. Never mix these. */
export type ShopKind = "fusion" | "canteen";

export const CANTEEN_ITEM_PREFIX = "canteen:";

export function isCanteenItemId(itemId: string): boolean {
  return itemId.startsWith(CANTEEN_ITEM_PREFIX);
}

export function canteenItemId(restaurantId: string, menuItemId: string): string {
  return `${CANTEEN_ITEM_PREFIX}${restaurantId}:${menuItemId}`;
}

export function parseCanteenItemId(
  itemId: string,
): { restaurantId: string; menuItemId: string } | null {
  if (!isCanteenItemId(itemId)) return null;
  const rest = itemId.slice(CANTEEN_ITEM_PREFIX.length);
  const colon = rest.indexOf(":");
  if (colon <= 0) return null;
  return {
    restaurantId: rest.slice(0, colon),
    menuItemId: rest.slice(colon + 1),
  };
}

export function shopKindFromItemId(itemId: string): ShopKind {
  return isCanteenItemId(itemId) ? "canteen" : "fusion";
}

export const SHOP_CART_STORAGE_KEY: Record<ShopKind, string> = {
  fusion: "fusion_cart",
  canteen: "canteen_cart",
};

export const SHOP_HOME_HREF: Record<ShopKind, string> = {
  fusion: "/fusion",
  canteen: "/canteen",
};

export const SHOP_CART_HREF: Record<ShopKind, string> = {
  fusion: "/cart",
  canteen: "/canteen/cart",
};

export const SHOP_CHECKOUT_HREF: Record<ShopKind, string> = {
  fusion: "/checkout",
  canteen: "/canteen/checkout",
};
