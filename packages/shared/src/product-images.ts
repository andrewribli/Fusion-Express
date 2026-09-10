/**
 * Product photo URLs. Wikimedia Commons pack shots are stored locally under
 * /images/products (hotlinking thumbs is blocked). Unsplash for generic
 * grocery photos. placehold.co when we have no legal pack shot (HK-only SKUs).
 */
export type ImageKind = "local-commons" | "unsplash" | "placeholder";

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=640&h=640&q=80`;

const ph = (label: string) =>
  `https://placehold.co/640x640/f3f4f6/111827.png?text=${encodeURIComponent(label)}`;

const U = {
  noodles: unsplash("photo-1569718212165-3a8278d5f624"),
  soda: unsplash("photo-1629203851122-3726ecdf080e"),
  juice: unsplash("photo-1600271886742-f049cd451bba"),
  milk: unsplash("photo-1563636619-e9143da7973b"),
  chips: unsplash("photo-1566478989037-eec170784d0b"),
  chocolate: unsplash("photo-1548907040-4baa42d10919"),
  bread: unsplash("photo-1509440159596-0249088772ff"),
  eggs: unsplash("photo-1582722872445-44dc5f7e3c8f"),
  dairy: unsplash("photo-1628088062854-d1870b4553da"),
  meat: unsplash("photo-1603048297172-c92544798d5e"),
  chicken: unsplash("photo-1598103442097-8b74394b95c2"),
  seafood: unsplash("photo-1559737558-2f5a35f4523b"),
  tofu: unsplash("photo-1546069901-ba9599a7e63c"),
  rice: unsplash("photo-1536304993881-ff6e9eefa2a6"),
  sauce: unsplash("photo-1472476443507-c7a5948772fc"),
  fruit: unsplash("photo-1619566636858-adf3ef46400b"),
  veg: unsplash("photo-1540420773420-3366772f4999"),
  coffee: unsplash("photo-1514432324607-a09d9b4aefdd"),
  frozen: unsplash("photo-1565299624946-b28f40a0ae38"),
  ice: unsplash("photo-1497034825429-c343d7c6a68f"),
  toiletry: unsplash("photo-1556228578-0d85b1a4d571"),
};

const byCategory: Record<string, string> = {
  "instant-noodles": U.noodles,
  "instant-meals": U.noodles,
  drinks: U.juice,
  snacks: U.chips,
  bread: U.bread,
  "dairy-eggs": U.eggs,
  toiletries: U.toiletry,
  "household-essentials": U.toiletry,
  meat: U.meat,
  seafood: U.seafood,
  "tofu-protein": U.tofu,
  "rice-noodles": U.rice,
  condiments: U.sauce,
  "fruit-veg": U.fruit,
  "coffee-tea": U.coffee,
  frozen: U.frozen,
};

export const PRODUCT_IMAGES: Record<string, { url: string; kind: ImageKind }> = {
  "indomie-goreng": {
    url: "/images/products/indomie-goreng.jpg",
    kind: "local-commons",
  },
  "shin-ramen-bowl": {
    url: "/images/products/shin-ramen-bowl.jpg",
    kind: "local-commons",
  },
  "nissin-cup-seafood": {
    url: "/images/products/nissin-cup-seafood.jpg",
    kind: "local-commons",
  },
  "nissin-cup-chicken": {
    url: "/images/products/nissin-cup-seafood.jpg",
    kind: "local-commons",
  },
  "nissin-cup-curry": {
    url: "/images/products/nissin-cup-seafood.jpg",
    kind: "local-commons",
  },
  "coke-can": { url: "/images/products/coke-can.jpg", kind: "local-commons" },
  "coke-zero-can": {
    url: "/images/products/coke-zero-can.jpg",
    kind: "local-commons",
  },
  "pocari-sweat": {
    url: "/images/products/pocari-sweat.jpg",
    kind: "local-commons",
  },
  "pocari-sweat-largest": {
    url: "/images/products/pocari-sweat-largest.jpg",
    kind: "local-commons",
  },
  "fanta-orange": {
    url: "/images/products/fanta-orange.jpg",
    kind: "local-commons",
  },
  "fanta-mini-6pack-orange": {
    url: "/images/products/fanta-mini.jpg",
    kind: "local-commons",
  },
  "oreo-original": {
    url: "/images/products/oreo-original.jpg",
    kind: "local-commons",
  },
  "oreo-golden": {
    url: "/images/products/oreo-golden.png",
    kind: "local-commons",
  },
  bananas: { url: "/images/products/bananas.jpg", kind: "local-commons" },
};

/** No Commons pack shot. Replace these by hand. */
export const PRODUCT_IMAGES_NEED_SWAP = [
  "pagoda-kumquat-lemon-bundle",
  "pagoda-kumquat-lemon",
  "tao-ti-mandarin-lemon",
  "milk-kowloon",
  "milk-meiji",
  "megabowl-beef",
  "megabowl-chicken",
  "megabowl-seafood",
  "megabowl-tom-yum",
  "megabowl-spicy-pork",
  "megabowl-kimchi",
] as const;

/** Real photo, wrong SKU / flavor. */
export const PRODUCT_IMAGES_CLOSE_MATCH = [
  "nissin-cup-chicken",
  "nissin-cup-curry",
  "coke-zero-can",
  "pocari-sweat-largest",
  "fanta-mini-6pack-orange",
] as const;

const placeholders: Record<string, string> = {
  "pagoda-kumquat-lemon-bundle": "Pagoda kumquat lemon",
  "pagoda-kumquat-lemon": "Pagoda kumquat lemon",
  "tao-ti-mandarin-lemon": "Tao Ti mandarin lemon",
  "milk-kowloon": "Kowloon Dairy milk",
  "milk-meiji": "Meiji milk",
  "megabowl-beef": "Mega Bowl beef",
  "megabowl-chicken": "Mega Bowl chicken",
  "megabowl-seafood": "Mega Bowl seafood",
  "megabowl-tom-yum": "Mega Bowl tom yum",
  "megabowl-spicy-pork": "Mega Bowl spicy pork",
  "megabowl-kimchi": "Mega Bowl kimchi",
};

for (const [id, label] of Object.entries(placeholders)) {
  PRODUCT_IMAGES[id] = { url: ph(label), kind: "placeholder" };
}

const extras: Record<string, string> = {
  "nissin-demae-tonkotsu": U.noodles,
  "nissin-demae-sesame": U.noodles,
  "nissin-demae-xo": U.noodles,
  "koka-spicy": U.noodles,
  "koka-tom-yum": U.noodles,
  "samyang-hot": U.noodles,
  "samyang-2x": U.noodles,
  "mama-tom-yum": U.noodles,
  "mama-pork": U.noodles,
  "paldo-bibim": U.noodles,
  "sprite-can": U.soda,
  "vitasoy-original": U.milk,
  "vitasoy-chocolate": U.milk,
  "minute-maid-orange": U.juice,
  "minute-maid-apple": U.juice,
  "lipton-lemon": U.juice,
  "lipton-peach": U.juice,
  yakult: U.milk,
  "lays-classic": U.chips,
  "lays-bbq": U.chips,
  "lays-sour-cream": U.chips,
  "pringles-original": U.chips,
  "pringles-sour-cream": U.chips,
  "kitkat-chocolate": U.chocolate,
  "kitkat-matcha": U.chocolate,
  snickers: U.chocolate,
  "mars-bar": U.chocolate,
  "m-ms-peanut": U.chocolate,
  "m-ms-chocolate": U.chocolate,
  "calbee-shrimp": U.chips,
  "calbee-sea-salt": U.chips,
  "calbee-spicy": U.chips,
  "garden-white-bread": U.bread,
  "garden-whole-wheat": U.bread,
  "garden-butter-buns": U.bread,
  "garden-sweet-buns": U.bread,
  "muffin-chocolate": U.bread,
  "muffin-blueberry": U.bread,
  "eggs-10": U.eggs,
  "eggs-6": U.eggs,
  "butter-lurpak": U.dairy,
  "cheese-kraft": U.dairy,
  "yogurt-meiji": U.dairy,
  "chicken-breast": U.chicken,
  "chicken-thigh": U.chicken,
  "chicken-wings": U.chicken,
  "ribeye-steak": U.meat,
  "sirloin-steak": U.meat,
  "tbone-steak": U.meat,
  "minced-beef": U.meat,
  "minced-pork": U.meat,
  "pork-chops": U.meat,
  "pork-belly": U.meat,
  bacon: U.meat,
  sausages: U.meat,
  "hot-dogs": U.meat,
  "ham-slices": U.meat,
  salami: U.meat,
  "salmon-fillet": U.seafood,
  "salmon-belly": U.seafood,
  "tuna-steak": U.seafood,
  "shrimp-peeled": U.seafood,
  "shrimp-frozen": U.seafood,
  "fish-fillet": U.seafood,
  "squid-rings": U.seafood,
  scallops: U.seafood,
  "crab-sticks": U.seafood,
  "fish-balls": U.seafood,
  apples: U.fruit,
  oranges: U.fruit,
  carrots: U.veg,
  cucumber: U.veg,
  tomatoes: U.veg,
  lettuce: U.veg,
  cabbage: U.veg,
  "frozen-pizza": U.frozen,
  "frozen-nuggets": U.chicken,
  "frozen-fries": U.frozen,
  "ice-cream-haagen": U.ice,
  "ice-cream-movenpick": U.ice,
  "frozen-dumplings": U.frozen,
  "nescafe-3in1": U.coffee,
  "nescafe-original": U.coffee,
  "lipton-tea-bags": U.coffee,
  "twinings-earl-grey": U.coffee,
  milo: U.coffee,
  ovaltine: U.coffee,
  "rice-5kg": U.rice,
  "rice-2kg": U.rice,
  "soba-noodles": U.noodles,
  "udon-noodles": U.noodles,
  "rice-vermicelli": U.noodles,
};

for (const [id, url] of Object.entries(extras)) {
  if (!PRODUCT_IMAGES[id]) PRODUCT_IMAGES[id] = { url, kind: "unsplash" };
}

export function imageForItem(id: string, _category: string): string {
  const mapped = PRODUCT_IMAGES[id];
  if (mapped?.kind === "local-commons") return mapped.url;
  return "";
}

export function imageKindForItem(id: string): ImageKind {
  if (PRODUCT_IMAGES[id]) return PRODUCT_IMAGES[id].kind;
  return "unsplash";
}

const THEME_PHOTOS: Record<string, string[]> = {
  beef: [
    unsplash("photo-1603048297172-c92544798d5e"),
    unsplash("photo-1558030006-450675393462"),
    unsplash("photo-1544025162-d76690232da9"),
  ],
  pork: [
    unsplash("photo-1602470520998-f4a76d0b8f62"),
    unsplash("photo-1529193591184-b1d5fddd9eef"),
    unsplash("photo-1626082927389-6cd097cdc6ec"),
  ],
  chicken: [
    unsplash("photo-1598103442097-8b74394b95c2"),
    unsplash("photo-1604503468506-a8da13d82791"),
    unsplash("photo-1610057099443-fde8c4d57a89"),
  ],
  seafood: [
    unsplash("photo-1559737558-2f5a35f4523b"),
    unsplash("photo-1615141982883-c7ad0e69fd62"),
    unsplash("photo-1534604973900-c43ab4c2e0ab"),
  ],
  dairy: [
    unsplash("photo-1563636619-e9143da7973b"),
    unsplash("photo-1628088062854-d1870b4553da"),
    unsplash("photo-1486297678162-eb2a19b0a32d"),
  ],
  eggs: [unsplash("photo-1582722872445-44dc5f7e3c8f"), unsplash("photo-1506976785307-8732e57605d0")],
  noodles: [unsplash("photo-1569718212165-3a8278d5f624"), unsplash("photo-1612929633738-8fe44f7ec841")],
  rice: [unsplash("photo-1536304993881-ff6e9eefa2a6"), unsplash("photo-1516684669134-de6f7c473a2a")],
  snacks: [unsplash("photo-1566478989037-eec170784d0b"), unsplash("photo-1621939514649-280e2ee25f60")],
  chocolate: [unsplash("photo-1548907040-4baa42d10919"), unsplash("photo-1606312619070-d48b4c652a82")],
  bread: [unsplash("photo-1509440159596-0249088772ff"), unsplash("photo-1549931319-a545dcf3bc73")],
  fruit: [unsplash("photo-1619566636858-adf3ef46400b"), unsplash("photo-1610832958506-aa56368176cf")],
  veg: [unsplash("photo-1540420773420-3366772f4999"), unsplash("photo-1566385101042-1a0aa0c1268c")],
  drinks: [unsplash("photo-1629203851122-3726ecdf080e"), unsplash("photo-1600271886742-f049cd451bba")],
  coffee: [unsplash("photo-1514432324607-a09d9b4aefdd"), unsplash("photo-1495474472287-4d71bcdd2085")],
  frozen: [unsplash("photo-1565299624946-b28f40a0ae38"), unsplash("photo-1497034825429-c343d7c6a68f")],
  sauce: [unsplash("photo-1472476443507-c7a5948772fc"), unsplash("photo-1473093295043-cdd812d0e601")],
  canned: [unsplash("photo-1534483509719-3feaee7c3cb5"), unsplash("photo-1584473457406-6240486418e9")],
  toiletry: [unsplash("photo-1556228578-0d85b1a4d571"), unsplash("photo-1556228720-195a672e8a03")],
  household: [unsplash("photo-1563453392212-326f5e854473"), unsplash("photo-1581578731548-c64695cc6952")],
  grocery: [unsplash("photo-1542838132-92c53300491e"), unsplash("photo-1578662996442-48f60103fc96")],
};

const THEME_KEYWORDS: Array<[string, string[]]> = [
  ["beef", ["beef", "steak", "striploin", "angus", "brisket"]],
  ["pork", ["pork", "bacon", "sausage", "ham", "belly"]],
  ["chicken", ["chicken", "poultry", "wing", "thigh", "nugget"]],
  ["seafood", ["fish", "salmon", "shrimp", "prawn", "seafood", "tuna", "crab"]],
  ["eggs", ["egg"]],
  ["dairy", ["milk", "yogurt", "yoghurt", "cheese", "butter", "cream"]],
  ["noodles", ["noodle", "ramen", "pasta", "udon", "vermicelli"]],
  ["rice", ["rice"]],
  ["snacks", ["chip", "crisp", "cracker", "snack", "biscuit"]],
  ["chocolate", ["chocolate", "cocoa", "oreo"]],
  ["bread", ["bread", "bun", "bakery", "cake", "muffin"]],
  ["fruit", ["fruit", "apple", "banana", "orange", "berry", "grape"]],
  ["veg", ["vegetable", "veg", "lettuce", "tomato", "onion", "cabbage"]],
  ["drinks", ["drink", "juice", "soda", "cola", "tea", "water", "beverage"]],
  ["coffee", ["coffee", "nescafe", "latte"]],
  ["frozen", ["frozen", "ice cream", "dumpling"]],
  ["sauce", ["sauce", "soy", "ketchup", "seasoning", "oil"]],
  ["canned", ["canned", "tin"]],
  ["toiletry", ["soap", "shampoo", "toothpaste", "deodorant", "wash"]],
  ["household", ["detergent", "tissue", "cleaner", "toilet"]],
];

function hashPick(seed: string, n: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % n;
}

function themeForText(text: string): string {
  const n = text.toLowerCase();
  for (const [theme, words] of THEME_KEYWORDS) {
    if (words.some((w) => n.includes(w))) return theme;
  }
  return "grocery";
}

/** Stable Unsplash photo that matches the product name / aisle. */
export function fallbackImageForDescription(
  name?: string,
  category?: string,
): string {
  const seed = `${name || ""} ${category || ""}`.trim() || "grocery";
  const theme = themeForText(seed);
  const pool = THEME_PHOTOS[theme] ?? THEME_PHOTOS.grocery;
  return pool[hashPick(seed, pool.length)] ?? pool[0];
}
