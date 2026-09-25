/**
 * Drink add-on with a mains item: ice HK$6 / hot HK$3 (replaces standalone drink price).
 * At most one add-on per main; removing the main removes its add-on.
 */

export const DRINK_ADDON_ICE_HKD = 6;
export const DRINK_ADDON_HOT_HKD = 3;

export type DrinkAddonKind = "ice" | "hot";

export const DRINK_ADDON_LABEL: Record<DrinkAddonKind, string> = {
  ice: "Iced Lemon Tea",
  hot: "Hot Drink",
};

export function drinkAddonPrice(kind: DrinkAddonKind): number {
  return kind === "ice" ? DRINK_ADDON_ICE_HKD : DRINK_ADDON_HOT_HKD;
}

export function drinkAddonCartId(
  restaurantId: string,
  mainItemId: string,
  kind: DrinkAddonKind,
): string {
  return `canteen:${restaurantId}:addon:${kind}:${mainItemId}`;
}

export function parseDrinkAddonId(cartItemId: string): {
  restaurantId: string;
  mainItemId: string;
  kind: DrinkAddonKind;
} | null {
  const m = /^canteen:([^:]+):addon:(ice|hot):(.+)$/.exec(cartItemId);
  if (!m) return null;
  return {
    restaurantId: m[1],
    kind: m[2] as DrinkAddonKind,
    mainItemId: m[3],
  };
}

export function isDrinkAddonItemId(id: string): boolean {
  return parseDrinkAddonId(id) !== null;
}

export function drinkAddonLineName(
  kind: DrinkAddonKind,
  mainItemName: string,
): string {
  return `Add-on: ${DRINK_ADDON_LABEL[kind]} (with ${mainItemName})`;
}
