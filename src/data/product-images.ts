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

export function imageForItem(id: string, category: string): string {
  return PRODUCT_IMAGES[id]?.url ?? byCategory[category] ?? U.chips;
}

export function imageKindForItem(id: string): ImageKind {
  if (PRODUCT_IMAGES[id]) return PRODUCT_IMAGES[id].kind;
  return "unsplash";
}
