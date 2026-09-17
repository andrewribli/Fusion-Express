import { getMenuItemById } from "@/lib/menu";
import type { MenuItem } from "@/lib/types";

const HOME_POPULAR: { label: string; ids: string[]; nameMatch: RegExp }[] = [
  { label: "Milk", ids: ["milk-kowloon", "milk-meiji"], nameMatch: /\bpure milk\b|\bfull cream milk\b|^meiji milk|^kowloon dairy milk/i },
  { label: "Steak", ids: ["sirloin-steak", "ribeye-steak"], nameMatch: /\bstriploin steak\b|\bsirloin steak\b|\bribeye steak\b/i },
  { label: "Ground Beef", ids: ["minced-beef"], nameMatch: /\bminced beef\b|\bground beef\b/i },
  { label: "Indomie", ids: ["indomie-goreng"], nameMatch: /\bindomie\b/i },
  { label: "Tea", ids: ["lipton-tea-bags"], nameMatch: /\btea bags\b|\blipton\b.*\btea\b/i },
  { label: "Rice", ids: ["rice-2kg", "rice-5kg"], nameMatch: /\brice\b/i },
];

function pickFromCatalog(products: MenuItem[], ids: string[], nameMatch: RegExp): MenuItem | undefined {
  for (const id of ids) {
    const found = products.find((item) => item.id === id);
    if (found) return found;
  }
  return products.find((item) => nameMatch.test(item.name));
}

export function resolveHomePopularItems(products: MenuItem[]): MenuItem[] {
  return HOME_POPULAR.map(({ ids, nameMatch }) => {
    return (
      pickFromCatalog(products, ids, nameMatch) ??
      ids.map((id) => getMenuItemById(id)).find((item): item is MenuItem => Boolean(item))
    );
  }).filter((item): item is MenuItem => Boolean(item));
}
