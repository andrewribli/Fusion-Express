/**
 * Second-pass fill for leftover catalog/menu gaps + Firestore empty/ellipsis URLs.
 * More aggressive brand+type matching; treats /images/products/* as valid.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = resolve(process.cwd(), "../..");
const SHARED = resolve(ROOT, "packages/shared/data");
const CATALOG = resolve(SHARED, "foodpanda-fusion-catalog.json");
const OVERRIDES = resolve(SHARED, "product-image-overrides.json");
const MENU = resolve(SHARED, "menu.json");
const HOUSEHOLD = resolve(SHARED, "foodpanda-fusion-household.json");
const MEAT = resolve(SHARED, "foodpanda-fusion-meat.json");
const SA = resolve(ROOT, "fusion-express-6a438-firebase-adminsdk-fbsvc-817676b923.json");

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
  if (u.startsWith("/images/products/")) return true;
  if (!u.startsWith("http")) return false;
  const lower = u.toLowerCase();
  if (lower.includes("…") || lower.includes("...")) return false;
  if (lower.includes("unsplash.com")) return false;
  if (lower.includes("placehold")) return false;
  if (lower.includes("/images/aisles/")) return false;
  if (lower.includes("upload.wikimedia.org")) return false;
  return true;
}

const TYPE_HINTS = [
  "shampoo",
  "conditioner",
  "toothpaste",
  "toothbrush",
  "soap",
  "handwash",
  "hand wash",
  "body wash",
  "shower",
  "deodorant",
  "tissue",
  "toilet",
  "wipe",
  "detergent",
  "dish",
  "foil",
  "cling",
  "bag",
  "ramen",
  "noodle",
  "spaghetti",
  "ketchup",
  "mayonnaise",
  "vinegar",
  "sauce",
  "honey",
  "spread",
  "jam",
  "tea",
  "coffee",
  "milk",
  "yogurt",
  "yoghurt",
  "cheese",
  "butter",
  "egg",
  "juice",
  "soda",
  "water",
  "chip",
  "cracker",
  "biscuit",
  "cookie",
  "chocolate",
  "candy",
  "bread",
  "bun",
  "rice",
  "beef",
  "pork",
  "chicken",
  "shrimp",
  "fish",
  "fruit",
  "apple",
  "orange",
  "banana",
  "grape",
  "berry",
  "tomato",
  "onion",
  "cucumber",
  "lettuce",
  "frozen",
  "dumpling",
  "wine",
  "chiew",
  "miju",
];

type Entry = { name: string; image: string; brand?: string; n: string };

function walk(nodes: any[], acc: any[]) {
  for (const n of nodes || []) {
    if (n.items) acc.push(...n.items);
    if (n.subcategories) walk(n.subcategories, acc);
  }
}

function hintOf(text: string): string | undefined {
  const n = norm(text);
  return TYPE_HINTS.find((h) => n.includes(h));
}

async function main() {
  const sa = JSON.parse(readFileSync(SA, "utf8"));
  if (!getApps().length) {
    initializeApp({ credential: cert(sa), projectId: sa.project_id });
  }
  const db = getFirestore();

  const pool: Entry[] = [];
  const push = (name: string, image: string, brand?: string) => {
    if (!isGoodUrl(image)) return;
    pool.push({
      name,
      image,
      brand,
      n: norm(brand ? `${brand} ${name}` : name),
    });
  };

  for (const path of [HOUSEHOLD, MEAT]) {
    for (const it of JSON.parse(readFileSync(path, "utf8")) as any[]) {
      push(it.name, it.image, it.brand);
    }
  }
  const catalog = JSON.parse(readFileSync(CATALOG, "utf8"));
  const catalogItems: any[] = [];
  walk(catalog.categories || [], catalogItems);
  for (const it of catalogItems) push(it.name, it.image, it.brand);

  const snap = await db.collection("products").get();
  for (const doc of snap.docs) {
    const d = doc.data();
    push(String(d.name || ""), String(d.image || ""), d.brand ? String(d.brand) : undefined);
  }
  console.log("pool", pool.length);

  const byNorm = new Map<string, string>();
  const byBrandHint = new Map<string, string>();
  const byHint = new Map<string, string>();
  for (const e of pool) {
    if (!byNorm.has(e.n)) byNorm.set(e.n, e.image);
    const bn = norm(e.name);
    if (!byNorm.has(bn)) byNorm.set(bn, e.image);
    const brand = e.brand ? norm(e.brand).split(" ")[0] : e.n.split(" ")[0];
    const hint = hintOf(e.n);
    if (brand && hint) {
      const key = `${brand}::${hint}`;
      if (!byBrandHint.has(key)) byBrandHint.set(key, e.image);
    }
    if (hint && !byHint.has(hint)) byHint.set(hint, e.image);
  }

  function resolveImg(name: string, brand?: string): string | undefined {
    const branded = norm(brand ? `${brand} ${name}` : name);
    const plain = norm(name);
    if (byNorm.has(branded)) return byNorm.get(branded);
    if (byNorm.has(plain)) return byNorm.get(plain);

    // substring contains
    for (const [k, img] of byNorm) {
      if (k.length < 8) continue;
      if (branded.includes(k) || k.includes(branded) || plain.includes(k) || k.includes(plain)) {
        if (Math.min(k.length, branded.length) / Math.max(k.length, branded.length) >= 0.5) {
          return img;
        }
      }
    }

    const brandTok = brand ? norm(brand).split(" ")[0] : "";
    const hint = hintOf(`${brand || ""} ${name}`);
    if (brandTok && hint) {
      const hit = byBrandHint.get(`${brandTok}::${hint}`);
      if (hit) return hit;
    }
    if (hint) return byHint.get(hint);
    return undefined;
  }

  const overrides: Record<string, string> = existsSync(OVERRIDES)
    ? JSON.parse(readFileSync(OVERRIDES, "utf8"))
    : {};

  let catFilled = 0;
  let catMiss = 0;
  for (const it of catalogItems) {
    if (isGoodUrl(it.image)) continue;
    const img = resolveImg(it.name, it.brand);
    if (img) {
      it.image = img;
      overrides[it.name] = img;
      catFilled++;
    } else catMiss++;
  }

  const menu = JSON.parse(readFileSync(MENU, "utf8"));
  let menuFilled = 0;
  let menuMiss = 0;
  for (const it of menu.items || []) {
    if (isGoodUrl(it.image)) continue;
    const img = resolveImg(it.name);
    if (img) {
      it.image = img;
      overrides[it.name] = img;
      menuFilled++;
    } else menuMiss++;
  }

  // Firestore repair
  let fsFixed = 0;
  let fsMiss = 0;
  let batch = db.batch();
  let ops = 0;
  const flush = async () => {
    if (!ops) return;
    await batch.commit();
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
      raw.startsWith("/images/catalog/") ||
      raw.includes("unsplash.com") ||
      raw.includes("placehold");
    if (!needs) continue;
    const img = resolveImg(String(d.name || ""), d.brand ? String(d.brand) : undefined);
    if (!img) {
      fsMiss++;
      continue;
    }
    batch.update(doc.ref, { image: img });
    ops++;
    fsFixed++;
    if (ops >= 400) await flush();
  }
  await flush();

  writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + "\n");
  writeFileSync(MENU, JSON.stringify(menu, null, 2) + "\n");
  writeFileSync(OVERRIDES, JSON.stringify(overrides, null, 2) + "\n");

  const afterGood = catalogItems.filter((i) => isGoodUrl(i.image)).length;
  console.log(
    JSON.stringify(
      {
        catalog: { filled: catFilled, stillMissing: catMiss, good: afterGood, total: catalogItems.length },
        menu: { filled: menuFilled, stillMissing: menuMiss },
        firestore: { fixed: fsFixed, miss: fsMiss },
      },
      null,
      2,
    ),
  );

  if (catMiss) {
    const left = catalogItems
      .filter((i) => !isGoodUrl(i.image))
      .slice(0, 40)
      .map((i) => `${i.brand || ""} | ${i.name}`);
    console.log("still missing sample:\n" + left.join("\n"));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
