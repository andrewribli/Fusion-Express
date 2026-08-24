import fs from "fs";
import path from "path";
import {
  imageForItem,
  imageKindForItem,
  PRODUCT_IMAGES_CLOSE_MATCH,
  PRODUCT_IMAGES_NEED_SWAP,
} from "../src/data/product-images";

const file = path.join(__dirname, "../src/data/menu.json");
const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
  items: { id: string; category: string; image?: string; name: string }[];
};

const counts: Record<string, number> = {};
for (const item of data.items) {
  item.image = imageForItem(item.id, item.category);
  const kind = imageKindForItem(item.id);
  counts[kind] = (counts[kind] ?? 0) + 1;
}

fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");

const flags = {
  placeholders: PRODUCT_IMAGES_NEED_SWAP.map((id) => ({
    id,
    name: data.items.find((item) => item.id === id)?.name ?? id,
    image: imageForItem(id, "drinks"),
    reason: "No Commons pack shot for this HK SKU. Replace with a Fusion shelf photo.",
  })),
  closeMatch: PRODUCT_IMAGES_CLOSE_MATCH.map((id) => ({
    id,
    name: data.items.find((item) => item.id === id)?.name ?? id,
    image: imageForItem(id, "drinks"),
    reason: "Real product photo, but flavor/size/packaging may not match the Fusion SKU.",
  })),
};

fs.writeFileSync(
  path.join(__dirname, "../src/data/product-image-flags.json"),
  JSON.stringify(flags, null, 2) + "\n",
);

console.log(`Patched ${data.items.length} items`, counts);
console.log(`Placeholders: ${flags.placeholders.length}`);
console.log(`Close matches: ${flags.closeMatch.length}`);
