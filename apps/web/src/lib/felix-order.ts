import { getMenuItemById } from "@/lib/menu";
import { hasBulkDeal, hasSale, lineTotal } from "@/lib/pricing";
import type { MenuItem } from "@/lib/types";

export interface CartEntry {
  item: MenuItem;
  quantity: number;
}

const FALLBACK_CUP_IDS = [
  "nissin-cup-seafood",
  "nissin-cup-curry",
  "nissin-cup-chicken",
] as const;

/** Felix's order: Shin Ramen × 3–4 if on sale, else 3 sale cup noodles under $40 */
export function buildFelixSuggestedCart(): CartEntry[] {
  const shin = getMenuItemById("shin-ramen-bowl");
  if (shin && (hasSale(shin) || hasBulkDeal(shin))) {
    const quantity = hasBulkDeal(shin) ? shin.bulkDealQty! : 3;
    return [{ item: shin, quantity }];
  }

  const cups = FALLBACK_CUP_IDS.map((id) => getMenuItemById(id)).filter(
    (item): item is MenuItem => Boolean(item),
  );

  if (cups.length >= 3) {
    return cups.slice(0, 3).map((item) => ({ item, quantity: 1 }));
  }

  return [];
}

export function describeFelixOrder(cart: CartEntry[]): string {
  if (cart.length === 0) return "Suggested order unavailable";
  const lines = cart.map(({ item, quantity }) => `${quantity}× ${item.name}`);
  const subtotal = cart.reduce((s, c) => s + lineTotal(c.item, c.quantity), 0);
  return `${lines.join(", ")} · subtotal $${subtotal}`;
}

export function felixOrderSubtotal(cart: CartEntry[]): number {
  return cart.reduce((s, c) => s + lineTotal(c.item, c.quantity), 0);
}
