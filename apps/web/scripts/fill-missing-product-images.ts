/**
 * Backfill missing/broken product images into:
 *  - packages/shared/data/foodpanda-fusion-catalog.json (web shop source)
 *  - packages/shared/data/product-image-overrides.json
 *  - packages/shared/data/menu.json (mobile fallback)
 *  - Firestore `products` docs with empty or ellipsis-corrupted URLs
 *
 * Sources: ParknShop enrichment cache, foodpanda household/meat JSON,
 * existing catalog images, Firestore products with good URLs.
 *
 * Usage: npx tsx scripts/fill-missing-product-images.ts [--dry-run] [--skip-firestore]
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = resolve(process.cwd(), "../..");
const SHARED = resolve(ROOT, "packages/shared/data");
const CATALOG = resolve(SHARED, "foodpanda-fusion-catalog.json");
const OVERRIDES = resolve(SHARED, "product-image-overrides.json");
const ENRICH = resolve(SHARED, "parknshop-enrichment.json");
const MENU = resolve(SHARED, "menu.json");
const HOUSEHOLD = resolve(SHARED, "foodpanda-fusion-household.json");
const MEAT = resolve(SHARED, "foodpanda-fusion-meat.json");
const SA = resolve(ROOT, "fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json");

const dryRun = process.argv.includes("--dry-run");
const skipFs = process.argv.includes("--skip-firestore");

function norm(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGoodUrl(url?: string | null): boolean {
  if (!url) return false;
  const u = url.trim();
  if (!u.startsWith("http")) return false;
  const lower = u.toLowerCase();
  if (lower.includes("…") || lower.includes("...")) return false;
  if (lower.includes("unsplash.com")) return false;
  if (lower.includes("placehold")) return false;
  if (lower.includes("/images/aisles/")) return false;
  if (lower.includes("aisle-dry") || lower.includes("aisle-refrigerated"))
    return false;
  if (lower.includes("upload.wikimedia.org")) return false; // often wrong
  return true;
}

function tokens(s: string): Set<string> {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "pack",
    "packs",
    "pieces",
    "piece",
    "pcs",
    "pc",
    "ml",
    "kg",
    "g",
    "l",
    "x",
  ]);
  return new Set(
    norm(s)
      .split(" ")
      .filter((t) => t.length >= 3 && !stop.has(t) && !/^\d+$/.test(t)),
  );
}

function score(query: string, candidate: string): number {
  const q = tokens(query);
  const c = tokens(candidate);
  if (!q.size || !c.size) return 0;
  let inter = 0;
  for (const t of q) if (c.has(t)) inter++;
  const overlap = inter / Math.max(q.size, c.size);
  const nq = norm(query);
  const nc = norm(candidate);
  const contains =
    nq.includes(nc) || nc.includes(nq) ? 0.25 : 0;
  return overlap + contains;
}

type ImgEntry = { name: string; image: string; brand?: string };

function walkCatalog(
  nodes: any[],
  acc: any[],
): void {
  for (const n of nodes || []) {
    if (n.items) acc.push(...n.items);
    if (n.subcategories) walkCatalog(n.subcategories, acc);
  }
}

async function loadFirestoreSources(): Promise<ImgEntry[]> {
  if (!existsSync(SA)) return [];
  const sa = JSON.parse(readFileSync(SA, "utf8"));
  if (!getApps().length) {
    initializeApp({ credential: cert(sa), projectId: sa.project_id });
  }
  const db = getFirestore();
  const snap = await db.collection("products").get();
  const out: ImgEntry[] = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    const image = String(d.image || "");
    if (!isGoodUrl(image)) continue;
    out.push({
      name: String(d.name || doc.id),
      image,
      brand: d.brand ? String(d.brand) : undefined,
    });
  }
  console.log(`Firestore good images: ${out.length}`);
  return out;
}

async function loadSources(): Promise<ImgEntry[]> {
  const out: ImgEntry[] = [];

  if (existsSync(ENRICH)) {
    const enrich = JSON.parse(readFileSync(ENRICH, "utf8")) as Record<
      string,
      { image?: string }
    >;
    for (const [name, v] of Object.entries(enrich)) {
      if (isGoodUrl(v?.image)) out.push({ name, image: v.image! });
    }
  }

  for (const path of [HOUSEHOLD, MEAT]) {
    if (!existsSync(path)) continue;
    const arr = JSON.parse(readFileSync(path, "utf8")) as any[];
    for (const it of arr) {
      if (isGoodUrl(it.image))
        out.push({ name: it.name, image: it.image, brand: it.brand });
    }
  }

  const catalog = JSON.parse(readFileSync(CATALOG, "utf8"));
  const items: any[] = [];
  walkCatalog(catalog.categories || [], items);
  for (const it of items) {
    if (isGoodUrl(it.image))
      out.push({ name: it.name, image: it.image, brand: it.brand });
  }

  if (existsSync(OVERRIDES)) {
    const ov = JSON.parse(readFileSync(OVERRIDES, "utf8")) as Record<
      string,
      string
    >;
    for (const [name, image] of Object.entries(ov)) {
      if (isGoodUrl(image)) out.push({ name, image });
    }
  }

  out.push(...(await loadFirestoreSources()));
  return out;
}

function buildIndex(sources: ImgEntry[]) {
  const byNorm = new Map<string, string>();
  const list: { name: string; image: string; n: string }[] = [];
  for (const s of sources) {
    const n = norm(s.name);
    const branded = s.brand ? norm(`${s.brand} ${s.name}`) : n;
    if (!byNorm.has(n)) byNorm.set(n, s.image);
    if (!byNorm.has(branded)) byNorm.set(branded, s.image);
    list.push({ name: s.name, image: s.image, n: branded });
  }
  return { byNorm, list };
}

function findImage(
  name: string,
  brand: string | undefined,
  index: ReturnType<typeof buildIndex>,
): string | undefined {
  const n = norm(name);
  const branded = brand ? norm(`${brand} ${name}`) : n;
  if (index.byNorm.has(n)) return index.byNorm.get(n);
  if (index.byNorm.has(branded)) return index.byNorm.get(branded);

  let best: { score: number; image: string } | null = null;
  const query = branded;
  // Prefer candidates that share brand token when present
  const brandTok = brand ? norm(brand).split(" ")[0] : "";
  for (const cand of index.list) {
    let sc = score(query, cand.n);
    if (brandTok && cand.n.includes(brandTok)) sc += 0.12;
    if (sc < 0.55) continue;
    if (!best || sc > best.score) best = { score: sc, image: cand.image };
  }
  // Brand-only fallback: same brand + shared product-type token
  if (!best && brandTok) {
    const typeHints = [
      "shampoo",
      "conditioner",
      "toothpaste",
      "toothbrush",
      "soap",
      "wash",
      "detergent",
      "tissue",
      "toilet",
      "wipes",
      "deodorant",
      "ramen",
      "noodle",
      "milk",
      "egg",
      "rice",
      "sauce",
      "juice",
      "tea",
      "coffee",
      "chicken",
      "beef",
      "pork",
      "shrimp",
      "fish",
    ];
    const qtok = tokens(query);
    const hint = typeHints.find((h) => qtok.has(h));
    if (hint) {
      for (const cand of index.list) {
        if (!cand.n.includes(brandTok)) continue;
        if (!tokens(cand.n).has(hint)) continue;
        return cand.image;
      }
    }
  }
  return best && best.score >= 0.55 ? best.image : undefined;
}

async function patchFirestore(
  index: ReturnType<typeof buildIndex>,
): Promise<{ fixed: number; miss: number }> {
  if (skipFs || !existsSync(SA)) {
    console.log("Skipping Firestore");
    return { fixed: 0, miss: 0 };
  }
  const sa = JSON.parse(readFileSync(SA, "utf8"));
  if (!getApps().length) {
    initializeApp({ credential: cert(sa), projectId: sa.project_id });
  }
  const db = getFirestore();
  const snap = await db.collection("products").get();
  let fixed = 0;
  let miss = 0;
  let batch = db.batch();
  let ops = 0;

  const flush = async () => {
    if (ops === 0) return;
    if (!dryRun) await batch.commit();
    batch = db.batch();
    ops = 0;
  };

  for (const doc of snap.docs) {
    const d = doc.data();
    const raw = String(d.image || "");
    const needs =
      !raw ||
      raw.includes("…") ||
      raw.includes("...") ||
      raw.startsWith("/images/catalog/");
    if (!needs) continue;
    const name = String(d.name || "");
    const brand = d.brand ? String(d.brand) : undefined;
    const img = findImage(name, brand, index);
    if (!img) {
      miss++;
      continue;
    }
    fixed++;
    if (!dryRun) {
      batch.update(doc.ref, { image: img });
      ops++;
      if (ops >= 400) await flush();
    }
  }
  await flush();
  return { fixed, miss };
}

async function fetchOpenFoodFacts(
  brand: string | undefined,
  name: string,
): Promise<string | undefined> {
  const q = [brand, name].filter(Boolean).join(" ").slice(0, 80);
  if (q.length < 4) return undefined;
  const url =
    "https://world.openfoodfacts.org/cgi/search.pl?" +
    new URLSearchParams({
      search_terms: q,
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: "5",
      fields: "product_name,brands,image_front_url,image_url",
    }).toString();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "GraceRunImageFill/1.0 (andrew@gracerun.fit)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      products?: {
        product_name?: string;
        brands?: string;
        image_front_url?: string;
        image_url?: string;
      }[];
    };
    for (const p of data.products || []) {
      const img = p.image_front_url || p.image_url;
      if (!isGoodUrl(img)) continue;
      const sc = score(
        `${brand || ""} ${name}`,
        `${p.brands || ""} ${p.product_name || ""}`,
      );
      if (sc >= 0.35) return img;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

async function main() {
  const sources = await loadSources();
  const index = buildIndex(sources);
  console.log(`Image sources: ${sources.length} entries, ${index.byNorm.size} keys`);

  // Patch catalog
  const catalog = JSON.parse(readFileSync(CATALOG, "utf8"));
  const catalogItems: any[] = [];
  walkCatalog(catalog.categories || [], catalogItems);
  let catFilled = 0;
  let catMiss = 0;
  let offFilled = 0;
  const overrides: Record<string, string> = existsSync(OVERRIDES)
    ? JSON.parse(readFileSync(OVERRIDES, "utf8"))
    : {};
  let ovAdded = 0;

  const stillNeedOff: any[] = [];
  for (const it of catalogItems) {
    if (isGoodUrl(it.image)) continue;
    const img = findImage(it.name, it.brand, index);
    if (img) {
      it.image = img;
      if (!isGoodUrl(overrides[it.name])) {
        overrides[it.name] = img;
        ovAdded++;
      }
      catFilled++;
    } else {
      stillNeedOff.push(it);
    }
  }

  console.log(`Local match filled ${catFilled}; OFF lookup for ${stillNeedOff.length}…`);
  for (let i = 0; i < stillNeedOff.length; i++) {
    const it = stillNeedOff[i];
    const img = await fetchOpenFoodFacts(it.brand, it.name);
    if (img) {
      it.image = img;
      overrides[it.name] = img;
      ovAdded++;
      offFilled++;
      catFilled++;
    } else {
      catMiss++;
    }
    if ((i + 1) % 25 === 0) {
      console.log(`  OFF ${i + 1}/${stillNeedOff.length} (hit ${offFilled})`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  // Patch menu.json
  let menuFilled = 0;
  let menuMiss = 0;
  if (existsSync(MENU)) {
    const menu = JSON.parse(readFileSync(MENU, "utf8"));
    for (const it of menu.items || []) {
      if (isGoodUrl(it.image)) continue;
      const img = findImage(it.name, undefined, index);
      if (img) {
        it.image = img;
        if (!isGoodUrl(overrides[it.name])) {
          overrides[it.name] = img;
          ovAdded++;
        }
        menuFilled++;
      } else {
        menuMiss++;
      }
    }
    if (!dryRun) {
      writeFileSync(MENU, JSON.stringify(menu, null, 2) + "\n", "utf8");
    }
  }

  if (!dryRun) {
    writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + "\n", "utf8");
    writeFileSync(OVERRIDES, JSON.stringify(overrides, null, 2) + "\n", "utf8");
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        catalog: {
          filled: catFilled,
          fromOpenFoodFacts: offFilled,
          stillMissing: catMiss,
        },
        menu: { filled: menuFilled, stillMissing: menuMiss },
        overridesAdded: ovAdded,
      },
      null,
      2,
    ),
  );

  const fsStats = await patchFirestore(index);
  console.log("firestore", fsStats);

  // Recount catalog coverage
  const after: any[] = [];
  walkCatalog(catalog.categories || [], after);
  const withImg = after.filter((i) => isGoodUrl(i.image)).length;
  console.log(`catalog coverage: ${withImg}/${after.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
