import { resolveProductImage } from "@fusion-express/shared/resolve-image";
import {
  categoryLabel,
  isRefrigeratedCategory,
  MENU_CATEGORIES,
  type MenuItem,
} from "@/lib/types";
import { getFreshFoodAisleIds } from "@/lib/catalog-products";

export function categorySlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export function firestoreProductToMenuItem(
  id: string,
  data: Record<string, unknown>,
): MenuItem {
  const image = resolveProductImage({
    id: String(data.id ?? id),
    name: String(data.name ?? "Product"),
    image: String(data.image ?? ""),
  });

  return {
    id: String(data.id ?? id),
    name: String(data.name ?? "Product"),
    category: categorySlug(String(data.category ?? "meat")),
    price: Number(data.price ?? 0),
    salePrice:
      data.salePrice != null && data.salePrice !== ""
        ? Number(data.salePrice)
        : undefined,
    originalPrice:
      data.originalPrice != null && data.originalPrice !== ""
        ? Number(data.originalPrice)
        : undefined,
    unit: String(data.unit ?? "each"),
    image,
    priceType: "fixed",
    runnerInputsPrice: false,
    inStock: data.inStock !== false,
    sortOrder: Number(data.sourceIndex ?? data.sortOrder ?? 0),
    weightKg: data.weightKg != null ? Number(data.weightKg) : 0.2,
    itemNote: data.brand ? String(data.brand) : undefined,
    description: data.description ? String(data.description) : undefined,
    ingredients: data.ingredients ? String(data.ingredients) : undefined,
    storage: data.storage ? String(data.storage) : undefined,
    options: Array.isArray(data.options)
      ? (data.options as MenuItem["options"])
      : undefined,
  };
}

export function groupProductsByCategory(items: MenuItem[]): {
  category: string;
  label: string;
  items: MenuItem[];
}[] {
  const buckets = new Map<string, MenuItem[]>();
  for (const item of items) {
    const list = buckets.get(item.category) ?? [];
    list.push(item);
    buckets.set(item.category, list);
  }

  const preferredOrder = [
    "household-essentials",
    ...MENU_CATEGORIES.filter((cat) => cat !== "household-essentials"),
  ];
  const preferred = preferredOrder.filter((cat) => buckets.has(cat));
  const extras = [...buckets.keys()]
    .filter((cat) => !preferred.includes(cat))
    .sort();

  return [...preferred, ...extras].map((category) => ({
    category,
    label: categoryLabel(category),
    items: buckets.get(category) ?? [],
  }));
}

function inferStoreSection(item: MenuItem): "dry" | "refrigerated" {
  if (item.storeSection) return item.storeSection;
  const freshAisles = getFreshFoodAisleIds();
  if (freshAisles.has(item.category) || isRefrigeratedCategory(item.category)) {
    return "refrigerated";
  }
  return "dry";
}

export function splitProductsBySection(items: MenuItem[]): {
  dry: MenuItem[];
  refrigerated: MenuItem[];
} {
  const dry: MenuItem[] = [];
  const refrigerated: MenuItem[] = [];
  for (const item of items) {
    if (inferStoreSection(item) === "refrigerated") {
      refrigerated.push(item);
    } else {
      dry.push(item);
    }
  }
  return { dry, refrigerated };
}
