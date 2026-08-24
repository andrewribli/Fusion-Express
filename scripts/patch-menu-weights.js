const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "../src/data/menu.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));

const CATEGORY_IMAGES = {
  meat: "/images/aisles/meat.png",
  seafood: "/images/aisles/seafood.jpg",
  "dairy-eggs": "/images/aisles/dairy-eggs.jpg",
  frozen: "/images/aisles/frozen.jpg",
  drinks: "/images/aisles/drinks.jpg",
  "fruit-veg": "/images/aisles/fruit-veg.jpg",
  "instant-noodles": "/images/aisles/instant-noodles.png",
  "instant-meals": "/images/aisles/instant-noodles.png",
  bread: "/images/aisles/bread.jpg",
  "rice-noodles": "/images/aisles/rice-noodles.jpg",
  snacks: "/images/aisles/snacks.jpg",
  condiments: "/images/aisles/condiments.jpg",
  "coffee-tea": "/images/aisles/coffee-tea.jpg",
  toiletries: "/images/aisles/toiletries.jpg",
  "tofu-protein": "/images/aisles/dairy-eggs.jpg",
};

function round2(n) {
  return Math.round(n * 100) / 100;
}

function weightFor(item) {
  const n = item.name.toLowerCase();
  const u = String(item.unit ?? "").toLowerCase();

  const kgName = n.match(/(\d+(?:\.\d+)?)\s*kg/);
  if (kgName) return Number(kgName[1]);

  const ml = n.match(/(\d+)\s*ml/);
  if (ml) return round2(Number(ml[1]) / 1000);

  const liters = n.match(/(\d+(?:\.\d+)?)\s*l\b/);
  if (liters && !n.includes("laundry")) return Number(liters[1]);

  const grams = n.match(/(\d+)\s*g\b/) || u.match(/(\d+)\s*g/);
  if (grams) return round2(Number(grams[1]) / 1000);

  if (n.includes("biggest") || n.includes("largest")) return 1.5;
  if (n.includes("6×") || n.includes("6-pack") || n.includes("mini 6")) return 1.3;
  if (n.includes("5-pack")) return 0.4;
  if (n.includes("4-roll") || n.includes("4-pack")) return 0.55;
  if (n.includes("10-pack") && item.category === "dairy-eggs") return 0.55;
  if (n.includes("12-pack")) return 0.8;
  if (n.includes("8-pack")) return 0.4;
  if (n.includes("bundle")) return 1.2;
  if (n.includes("1l") || n.includes("1 l")) return 1.05;
  if (u === "loaf") return 0.4;
  if (u === "bunch") return 0.8;
  if (item.category === "instant-meals") return 0.35;
  if (u === "cup" || (u === "bowl" && item.category === "instant-noodles")) return 0.12;
  if (u === "pack" && item.category === "instant-noodles") return 0.12;
  if (u === "can" && item.category === "drinks") return 0.33;
  if (u === "can" && item.category === "snacks") return 0.16;
  if (u === "bar") return 0.05;
  if (u === "bag" && item.category === "snacks") return 0.15;
  if (item.category === "toiletries" && u === "bottle") return 0.4;
  if (item.category === "toiletries" && u === "tube") return 0.12;
  if (item.category === "condiments") return 0.4;
  if (item.category === "coffee-tea" && u === "jar") return 0.2;
  if (item.category === "coffee-tea") return 0.15;
  if (item.category === "frozen" && u === "tub") return 0.5;
  if (item.category === "frozen") return 0.45;
  if (item.category === "meat") return 0.3;
  if (item.category === "seafood") return 0.25;
  if (item.category === "tofu-protein") return 0.3;
  if (item.category === "fruit-veg") return 0.35;
  if (item.category === "rice-noodles") return 0.4;
  if (item.category === "bread") return 0.12;
  return 0.2;
}

for (const item of data.items) {
  item.weightKg = weightFor(item);
  item.image = CATEGORY_IMAGES[item.category] ?? "/images/aisles/snacks.jpg";
}

fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
console.log(`Patched ${data.items.length} items with weightKg + image`);
