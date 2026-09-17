import type { MenuItem, OrderItem } from "@/lib/types";
import { CUSTOM_ITEM_DEFAULT_WEIGHT_KG } from "@/lib/constants";

/** Rebuild a cart line from a past order using live catalog prices when possible. */
export function menuItemFromOrderLine(
  line: OrderItem,
  catalog: MenuItem[],
): MenuItem {
  const found = catalog.find((item) => item.id === line.itemId);
  if (found) return found;
  const custom = line.itemId.startsWith("custom-");
  return {
    id: line.itemId,
    name: line.name,
    category: "snacks",
    price: line.price,
    unit: "item",
    priceType: custom ? "variable" : "fixed",
    runnerInputsPrice: custom,
    inStock: true,
    sortOrder: 9999,
    weightKg: line.weightKg ?? CUSTOM_ITEM_DEFAULT_WEIGHT_KG,
  };
}
