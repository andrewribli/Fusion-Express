const UNKNOWN = /\bunknown\b/i;
const NOISE_PARENS =
  /\([^)]*(?:unknown|unclear|partial|obscured|variant|label|facings?|facing|right-edge|left-edge|second)[^)]*\)/gi;
const TRAILING_NOISE = /,\s*(?:cut|variant|product)\s*$/i;

export function isUnknownText(value?: string | null): boolean {
  if (!value) return true;
  const t = value.trim().toLowerCase();
  return t === "" || t === "unknown" || t === "?";
}

export function cleanBrand(brand?: string | null): string | undefined {
  if (isUnknownText(brand)) return undefined;
  const text = brand!
    .replace(UNKNOWN, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[,\-]+|[,\-]+$/g, "");
  return text || undefined;
}

export function cleanProductName(
  name: string,
  opts?: { brand?: string; subcategory?: string },
): string {
  let text = name
    .replace(NOISE_PARENS, "")
    .replace(UNKNOWN, "")
    .replace(TRAILING_NOISE, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[,\-]+|[,\-]+$/g, "");

  const brand = cleanBrand(opts?.brand);
  if (brand && text.toLowerCase().startsWith(brand.toLowerCase())) {
    const rest = text.slice(brand.length).trim().replace(/^[-\s]+/, "");
    if (rest.length >= 4) text = rest;
  }

  if (text.length >= 4) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  if (opts?.subcategory && !isUnknownText(opts.subcategory)) {
    return opts.subcategory;
  }
  return "Item";
}
