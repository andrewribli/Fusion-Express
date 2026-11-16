/**
 * Final pass: same-subcategory / keyword sibling images for the last gaps.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const SHARED = resolve(process.cwd(), "../../packages/shared/data");
const CATALOG = resolve(SHARED, "foodpanda-fusion-catalog.json");
const OVERRIDES = resolve(SHARED, "product-image-overrides.json");
const MENU = resolve(SHARED, "menu.json");

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

function norm(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function walk(nodes: any[], acc: any[]) {
  for (const n of nodes || []) {
    if (n.items) acc.push(...n.items);
    if (n.subcategories) walk(n.subcategories, acc);
  }
}

const KEYWORD_MAP: Array<[RegExp, string[]]> = [
  [/sardine/i, ["sardine", "fish", "canned"]],
  [/mushroom/i, ["mushroom"]],
  [/udon/i, ["udon", "noodle"]],
  [/sausage/i, ["sausage", "pork"]],
  [/marinated meat|minced meat|meat tray|duck/i, ["beef", "pork", "chicken", "meat"]],
  [/berr|cherr/i, ["berr", "cherr", "strawberry", "blueberry"]],
  [/orange|mandarin/i, ["orange", "mandarin", "citrus"]],
  [/peach/i, ["peach"]],
  [/coconut/i, ["coconut"]],
  [/grape|muscat/i, ["grape", "muscat"]],
  [/zucchini|courgette|cucumber|pepper|radish|vegetable/i, ["vegetable", "cucumber", "tomato", "lettuce"]],
  [/ice cream|soft serve|brulee|melon/i, ["ice cream", "ice-cream", "frozen"]],
  [/fumigator|insecticide|deodorizing|air fresh/i, ["tissue", "detergent", "cleaner", "household"]],
  [/chick pea|chickpea/i, ["bean", "pea", "lentil"]],
  [/toothpaste|toothbrush|colgate/i, ["toothpaste", "oral", "colgate"]],
  [/shampoo|conditioner|head.?shoulders/i, ["shampoo", "conditioner", "hair"]],
  [/sanitizer/i, ["sanitizer", "hand wash", "dettol"]],
  [/detergent|laundry/i, ["detergent", "laundry"]],
  [/hot dog/i, ["sausage", "hot dog", "frankfurter"]],
  [/ketchup/i, ["ketchup", "tomato"]],
  [/nescaf|ovaline|ovaltine|milo/i, ["coffee", "nescafe", "milo", "oval"]],
  [/tao ti|lemon juice|juice drink/i, ["juice", "lemon", "tea"]],
];

async function main() {
  const catalog = JSON.parse(readFileSync(CATALOG, "utf8"));
  const items: any[] = [];
  walk(catalog.categories || [], items);
  const overrides: Record<string, string> = existsSync(OVERRIDES)
    ? JSON.parse(readFileSync(OVERRIDES, "utf8"))
    : {};

  const good = items.filter((i) => isGoodUrl(i.image));
  const bySub = new Map<string, string>();
  for (const it of good) {
    const sub = norm(it.subcategory || it.category || "");
    if (sub && !bySub.has(sub)) bySub.set(sub, it.image);
  }

  function sibling(name: string, sub?: string, brand?: string): string | undefined {
    if (sub && bySub.has(norm(sub))) return bySub.get(norm(sub));
    const n = `${brand || ""} ${name}`;
    for (const [re, keys] of KEYWORD_MAP) {
      if (!re.test(n)) continue;
      for (const it of good) {
        const hay = `${it.brand || ""} ${it.name}`.toLowerCase();
        if (keys.some((k) => hay.includes(k))) return it.image;
      }
    }
    return undefined;
  }

  let filled = 0;
  for (const it of items) {
    if (isGoodUrl(it.image)) continue;
    const img = sibling(it.name, it.subcategory || it.category, it.brand);
    if (img) {
      it.image = img;
      overrides[it.name] = img;
      filled++;
    } else {
      console.log("STILL", it.brand, "|", it.name, "|", it.subcategory);
    }
  }

  const menu = JSON.parse(readFileSync(MENU, "utf8"));
  let menuFilled = 0;
  for (const it of menu.items || []) {
    if (isGoodUrl(it.image)) continue;
    const img =
      overrides[it.name] ||
      sibling(it.name, it.category) ||
      good.find((g) =>
        norm(g.name).includes(norm(it.name).split(" ")[0] || "___"),
      )?.image;
    if (img) {
      it.image = img;
      overrides[it.name] = img;
      menuFilled++;
    } else {
      console.log("MENU STILL", it.name);
    }
  }

  writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + "\n");
  writeFileSync(MENU, JSON.stringify(menu, null, 2) + "\n");
  writeFileSync(OVERRIDES, JSON.stringify(overrides, null, 2) + "\n");

  const catalogGood = items.filter((i) => isGoodUrl(i.image)).length;
  const menuGood = (menu.items || []).filter((i: any) => isGoodUrl(i.image)).length;
  console.log(
    JSON.stringify(
      {
        filled,
        menuFilled,
        catalogGood,
        catalogTotal: items.length,
        menuGood,
        menuTotal: menu.items.length,
        pct: Math.round((catalogGood / items.length) * 1000) / 10,
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
