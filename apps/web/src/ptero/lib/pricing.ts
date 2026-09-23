import type { CartItem, MenuItem } from "@/ptero/lib/types";

export function getUnitPrice(item: MenuItem): number {
  return item.salePrice ?? item.price;
}

export function lineTotal(item: MenuItem, quantity: number): number {
  return getUnitPrice(item) * quantity;
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, c) => sum + lineTotal(c.item, c.quantity), 0);
}
