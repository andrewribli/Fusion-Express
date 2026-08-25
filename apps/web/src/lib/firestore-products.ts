import {
  categoryLabel,
  isRefrigeratedCategory,
  MENU_CATEGORIES,
  type MenuItem,
} from "@/lib/types";

export function categorySlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export function firestoreProductToMenuItem(
  id: string,
  data: Record<string, unknown>,
): MenuItem {
  const image = String(data.image ?? "");
  const usableImage =
    image.startsWith("http") && !image.includes("…") && !image.includes("...")
      ? image
      : undefined;

  return {
    id: String(data.id ?? id),
    name: String(data.name ?? "Product"),
    category: categorySlug(String(data.category ?? "meat")),
    price: Number(data.price ?? 0),
    unit: String(data.unit ?? "each"),
    image: usableImage,
    priceType: "fixed",
    runnerInputsPrice: false,
    inStock: data.inStock !== false,
    sortOrder: Number(data.sourceIndex ?? data.sortOrder ?? 0),
    weightKg: data.weightKg != null ? Number(data.weightKg) : 0.2,
    itemNote: data.brand ? String(data.brand) : undefined,
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

export function splitProductsBySection(items: MenuItem[]): {
  dry: MenuItem[];
  refrigerated: MenuItem[];
} {
  const dry: MenuItem[] = [];
  const refrigerated: MenuItem[] = [];
  for (const item of items) {
    if (isRefrigeratedCategory(item.category)) refrigerated.push(item);
    else dry.push(item);
  }
  return { dry, refrigerated };
}
