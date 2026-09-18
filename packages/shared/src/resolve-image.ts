import overrides from "../data/product-image-overrides.json";
import { fallbackImageForDescription, PRODUCT_IMAGES } from "./product-images";

const byName = overrides as Record<string, string>;

export function upscaleRetailImage(url: string): string {
  if (
    url.includes("foodpanda.dhmedia.io") ||
    url.includes("images.deliveryhero.io")
  ) {
    // Thumb-sized requests; 640 was oversized for product cards.
    if (url.includes("height=")) return url.replace(/height=\d+/, "height=200");
    return `${url}${url.includes("?") ? "&" : "?"}height=200`;
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
  category?: string;
}): string | undefined {
  // /images/catalog/* is excluded from Vercel deploys (~170MB+). Do not
  // prefer those paths — fall through to overrides / remote / aisle fallback.
  const localCatalog =
    item.image?.startsWith("/images/catalog/") === true
      ? undefined
      : item.image;
  const named = item.name ? byName[item.name] : undefined;
  if (named && !named.startsWith("/images/catalog/") && !isGenericImageUrl(named)) {
    return upscaleRetailImage(named);
  }
  if (named && !named.startsWith("/images/catalog/")) return named;
  if (localCatalog && !isGenericImageUrl(localCatalog)) {
    return upscaleRetailImage(localCatalog);
  }
  if (item.id) {
    const mapped = PRODUCT_IMAGES[item.id];
    if (mapped?.kind === "local-commons") return mapped.url;
  }
  return fallbackImageForDescription(item.name, item.category);
}
