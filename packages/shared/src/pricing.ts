import type { MenuItem } from "./types";

/** Unit price after sale discount */
export function getUnitPrice(item: MenuItem): number {
  return item.salePrice ?? item.price;
}

export function hasSale(item: MenuItem): boolean {
  return item.salePrice != null && item.salePrice < item.price;
}

export function hasBulkDeal(item: MenuItem): boolean {
  return (
    item.bulkDealQty != null &&
    item.bulkDealPrice != null &&
    item.bulkDealQty > 1
  );
}

/** Line total including bulk-deal pricing */
export function lineTotal(item: MenuItem, quantity: number): number {
  const unit = getUnitPrice(item);
  if (
    hasBulkDeal(item) &&
    item.bulkDealQty != null &&
    item.bulkDealPrice != null &&
    quantity >= item.bulkDealQty
  ) {
    const bundles = Math.floor(quantity / item.bulkDealQty);
    const remainder = quantity % item.bulkDealQty;
    return bundles * item.bulkDealPrice + remainder * unit;
  }
  return quantity * unit;
}

export function cartSubtotal(items: { item: MenuItem; quantity: number }[]): number {
  return items.reduce((sum, c) => sum + lineTotal(c.item, c.quantity), 0);
}

export function formatSaleLabel(item: MenuItem): string | null {
  if (hasBulkDeal(item)) {
    return `${item.bulkDealQty} for $${item.bulkDealPrice}`;
  }
  if (hasSale(item)) {
    return `$${item.salePrice} (was $${item.price})`;
  }
  return null;
}
