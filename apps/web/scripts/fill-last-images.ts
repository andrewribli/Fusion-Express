/**
 * Last-pass: Open Food Facts + brand-level fallbacks for stubborn catalog gaps.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const SHARED = resolve(process.cwd(), "../../packages/shared/data");
const CATALOG = resolve(SHARED, "foodpanda-fusion-catalog.json");
const OVERRIDES = resolve(SHARED, "product-image-overrides.json");
const MENU = resolve(SHARED, "menu.json");

function norm(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isGoodUrl(url?: string | null): boolean {
  if (!url) return false;
  const u = url.trim();
  if (u.startsWith("/images/products/")) return true;
  if (!u.startsWith("http")) return false;
  const lower = u.toLowerCase();
  return !(
    lower.includes("…") ||
    lower.includes("...") ||
    lower.includes("unsplash") ||
    lower.includes("placehold") ||
    lower.includes("/images/aisles/") ||
    lower.includes("upload.wikimedia")
  );
}

function walk(nodes: any[], acc: any[]) {
  for (const n of nodes || []) {
    if (n.items) acc.push(...n.items);
    if (n.subcategories) walk(n.subcategories, acc);
  }
}

/** Verified PNS / Foodpanda pack shots for stubborn leftovers. */
const MANUAL: Record<string, string> = {
  "Charcoal Travel Kit":
    "https://medias.pns.hk/publishing/PNSHK-189240-front-prodcat.jpg?version=1762950532",
  "Laksa LaMian":
    "https://foodpanda.dhmedia.io/image/nv/Hong-Kong/Fusion-Taste-PNS/147147.jpg?height=200",
  "Tomato Ketchup":
    "https://medias.pns.hk/publishing/PNSHK-106250-front-prodcat.jpg",
};

async function offSearch(q: string): Promise<string | undefined> {
  const url =
    "https://world.openfoodfacts.org/cgi/search.pl?" +
    new URLSearchParams({
      search_terms: q.slice(0, 80),
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: "8",
      fields: "product_name,brands,image_front_url,image_url",
    }).toString();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "GraceRunImageFill/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      products?: { image_front_url?: string; image_url?: string }[];
    };
    for (const p of data.products || []) {
      const img = p.image_front_url || p.image_url;
      if (isGoodUrl(img)) return img!;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

async function main() {
  const catalog = JSON.parse(readFileSync(CATALOG, "utf8"));
  const items: any[] = [];
  walk(catalog.categories || [], items);
  const overrides: Record<string, string> = existsSync(OVERRIDES)
    ? JSON.parse(readFileSync(OVERRIDES, "utf8"))
    : {};

  // Build brand→any good image from already-filled catalog
  const brandImg = new Map<string, string>();
  for (const it of items) {
    if (!isGoodUrl(it.image) || !it.brand) continue;
    const b = norm(it.brand).split(" ")[0];
    if (b && !brandImg.has(b)) brandImg.set(b, it.image);
  }

  let filled = 0;
  let miss = 0;
  for (const it of items) {
    if (isGoodUrl(it.image)) continue;

    let img =
      MANUAL[it.name] ||
      (it.brand && MANUAL[it.brand]) ||
      undefined;

    if (!img) {
      const q = [it.brand, it.name].filter(Boolean).join(" ");
      img = await offSearch(q);
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!img && it.brand) {
      img = await offSearch(String(it.brand));
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!img && it.brand) {
      const b = norm(it.brand).split(" ")[0];
      img = brandImg.get(b);
    }

    if (img && isGoodUrl(img)) {
      it.image = img;
      overrides[it.name] = img;
      filled++;
    } else {
      miss++;
      console.log("MISS", it.brand, "|", it.name);
    }
  }

  const menu = JSON.parse(readFileSync(MENU, "utf8"));
  let menuFilled = 0;
  for (const it of menu.items || []) {
    if (isGoodUrl(it.image)) continue;
    let img: string | undefined = MANUAL[it.name] || overrides[it.name];
    if (!img) img = await offSearch(it.name);
    if (img && isGoodUrl(img)) {
      it.image = img;
      overrides[it.name] = img;
      menuFilled++;
    } else {
      console.log("MENU MISS", it.name);
    }
  }

  writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + "\n");
  writeFileSync(MENU, JSON.stringify(menu, null, 2) + "\n");
  writeFileSync(OVERRIDES, JSON.stringify(overrides, null, 2) + "\n");

  const good = items.filter((i) => isGoodUrl(i.image)).length;
  console.log(
    JSON.stringify(
      {
        catalogFilled: filled,
        catalogMiss: miss,
        catalogGood: good,
        catalogTotal: items.length,
        menuFilled,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
