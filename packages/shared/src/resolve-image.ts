import overrides from "../data/product-image-overrides.json";
import { PRODUCT_IMAGES } from "./product-images";

const byName = overrides as Record<string, string>;

export function upscaleRetailImage(url: string): string {
  if (
    url.includes("foodpanda.dhmedia.io") ||
    url.includes("images.deliveryhero.io")
  ) {
    if (url.includes("height=")) return url.replace(/height=\d+/, "height=640");
    return `${url}${url.includes("?") ? "&" : "?"}height=640`;
  }
  return url;
}

export function isGenericImageUrl(url?: string): boolean {
  if (!url) return true;
  const u = url.toLowerCase();
  return (
    u.includes("unsplash.com") ||
    u.includes("placehold.co") ||
    u.includes("/images/aisles/") ||
    u.includes("aisle-dry") ||
    u.includes("aisle-refrigerated") ||
    u.includes("…") ||
    u.includes("...")
  );
}

export function resolveProductImage(item: {
  id?: string;
  name?: string;
  image?: string;
}): string | undefined {
  const named = item.name ? byName[item.name] : undefined;
  if (named) return named;
  if (item.image && !isGenericImageUrl(item.image)) {
    return upscaleRetailImage(item.image);
  }
  if (item.id) {
    const mapped = PRODUCT_IMAGES[item.id];
    if (mapped?.kind === "local-commons") return mapped.url;
  }
  return undefined;
}
