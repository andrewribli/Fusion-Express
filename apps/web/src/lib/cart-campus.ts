import {
  campusConfig,
  resolveCampus,
  type CampusId,
} from "@fusion-express/shared/campus";
import type { CartItem } from "@/lib/types";

/** Fusion catalog and canteen items predate `campus` on items; they are CUHK. */
export function cartCampuses(items: CartItem[]): CampusId[] {
  return [...new Set(items.map(({ item }) => resolveCampus(item.campus)))];
}

/** The single campus a cart can be delivered to, or null when empty or mixed. */
export function cartCampus(items: CartItem[]): CampusId | null {
  const campuses = cartCampuses(items);
  return campuses.length === 1 ? campuses[0] : null;
}

function storeLabel(campus: CampusId): string {
  const cfg = campusConfig[campus];
  return `${cfg.supermarket} (${cfg.name})`;
}

/**
 * Why this cart cannot be delivered to `deliveryCampus`, or null when it can.
 * Runners only shop on their own campus, so a cart must come from one campus
 * and be delivered there.
 */
export function cartCampusError(
  items: CartItem[],
  deliveryCampus: CampusId | null,
): string | null {
  const campuses = cartCampuses(items);
  if (campuses.length > 1) {
    return `Your cart mixes ${campuses.map(storeLabel).join(" and ")} items. Remove one campus's items to continue.`;
  }
  const from = campuses[0];
  if (!from || !deliveryCampus || from === deliveryCampus) return null;
  return `These items are from ${storeLabel(from)} and can only be delivered to ${campusConfig[from].name} halls.`;
}
