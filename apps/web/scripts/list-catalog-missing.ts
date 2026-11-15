import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const SHARED = resolve(process.cwd(), "../../packages/shared/data");
const catalog = JSON.parse(
  readFileSync(resolve(SHARED, "foodpanda-fusion-catalog.json"), "utf8"),
);

function walk(nodes: any[], acc: any[]) {
  for (const n of nodes || []) {
    if (n.items) acc.push(...n.items);
    if (n.subcategories) walk(n.subcategories, acc);
  }
}
const items: any[] = [];
walk(catalog.categories, items);
const miss = items
  .filter((i) => !i.image)
  .map((i) => ({
    brand: i.brand || "",
    name: i.name,
    sub: i.subcategory || "",
    cat: i.category || "",
  }));
const bySub: Record<string, number> = {};
for (const m of miss) {
  const k = m.sub || m.cat || "?";
  bySub[k] = (bySub[k] || 0) + 1;
}
console.log(JSON.stringify({ missing: miss.length, bySub, sample: miss.slice(0, 50) }, null, 2));
writeFileSync(
  resolve(process.cwd(), "scripts/.catalog-missing.json"),
  JSON.stringify(miss, null, 2),
);
