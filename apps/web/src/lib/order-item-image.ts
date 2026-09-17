import { getItemImage } from "@/data/aisle-images";
import { getCatalogMenuItems } from "@/lib/catalog-products";
import { resolveProductImage } from "@fusion-express/shared/resolve-image";
import type { MenuItem } from "@/lib/types";

let byId: Map<string, MenuItem> | null = null;
let byName: Map<string, MenuItem> | null = null;

function catalogMaps() {
  if (!byId || !byName) {
    byId = new Map();
    byName = new Map();
    for (const item of getCatalogMenuItems()) {
      byId.set(item.id, item);
      byName.set(item.name.trim().toLowerCase(), item);
    }
  }
  return { byId, byName };
}

export function imageForOrderLine(item: {
  itemId: string;
  name: string;
}): string {
  const { byId: ids, byName: names } = catalogMaps();
  const catalog =
    ids.get(item.itemId) ?? names.get(item.name.trim().toLowerCase());
  if (catalog) return getItemImage(catalog);
  return (
    resolveProductImage({ id: item.itemId, name: item.name }) ?? ""
  );
}
