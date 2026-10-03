import type { MenuItem, ProductOptionGroup } from "@/lib/types";

const RIPENESS_KEYWORDS = ["banana", "avocado", "mango"];

export function needsRipenessOption(item: MenuItem): boolean {
  const name = item.name.toLowerCase();
  return RIPENESS_KEYWORDS.some((k) => name.includes(k));
}

export function ripenessOptionGroup(): ProductOptionGroup {
  return {
    id: "ripeness",
    label: "Ripeness",
    type: "single",
    defaultValue: 3,
    choices: [1, 2, 3, 4, 5, 6].map((n) => ({
      id: String(n),
      label: String(n),
      value: n,
    })),
  };
}

/** Options from schema, plus inferred ripeness for banana/avocado/mango. */
export function resolveProductOptions(item: MenuItem): ProductOptionGroup[] {
  const fromSchema = item.options ?? [];
  if (fromSchema.some((g) => g.id === "ripeness")) return fromSchema;
  if (needsRipenessOption(item)) {
    return [...fromSchema, ripenessOptionGroup()];
  }
  return fromSchema;
}

export function defaultSelectedOptions(
  item: MenuItem,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const group of resolveProductOptions(item)) {
    const fallback = group.choices[0]?.value;
    const value = group.defaultValue ?? fallback;
    if (value !== undefined) out[group.id] = value;
  }
  return out;
}

export function compareAtPrice(item: MenuItem): number | null {
  if (item.originalPrice != null && item.originalPrice > item.price) {
    return item.originalPrice;
  }
  if (item.salePrice != null && item.salePrice < item.price) {
    return item.price;
  }
  return null;
}

export function effectiveUnitPrice(item: MenuItem): number {
  if (item.salePrice != null && item.salePrice < item.price) return item.salePrice;
  return item.price;
}
