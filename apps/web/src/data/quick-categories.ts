import { AISLE_IMAGES } from "@/data/aisle-images";

export interface QuickCategory {
  id: string;
  label: string;
  href: string;
  image: string;
  emoji: string;
}

/** Horizontal home category chips (Taobao-style). */
export const QUICK_CATEGORIES: QuickCategory[] = [
  {
    id: "instant-noodles",
    label: "Noodles",
    href: "/browse/dry/instant-noodles",
    image: AISLE_IMAGES["instant-noodles"],
    emoji: "🍜",
  },
  {
    id: "drinks",
    label: "Drinks",
    href: "/browse/dry/drinks",
    image: AISLE_IMAGES.drinks ?? AISLE_IMAGES["canned-goods"],
    emoji: "🥤",
  },
  {
    id: "snacks",
    label: "Snacks",
    href: "/browse/dry/snacks",
    image: AISLE_IMAGES.snacks ?? AISLE_IMAGES.chips,
    emoji: "🍪",
  },
  {
    id: "toiletries",
    label: "Toiletries",
    href: "/browse/dry/toiletries",
    image: AISLE_IMAGES.toiletries,
    emoji: "🧴",
  },
  {
    id: "dairy",
    label: "Dairy",
    href: "/browse/refrigerated/dairy",
    image: AISLE_IMAGES.dairy,
    emoji: "🥛",
  },
  {
    id: "frozen-food",
    label: "Frozen",
    href: "/browse/refrigerated/frozen-food",
    image: AISLE_IMAGES["frozen-food"],
    emoji: "🧊",
  },
  {
    id: "beef",
    label: "Beef",
    href: "/browse/refrigerated/beef",
    image: AISLE_IMAGES.beef,
    emoji: "🥩",
  },
  {
    id: "chicken",
    label: "Chicken",
    href: "/browse/refrigerated/chicken",
    image: AISLE_IMAGES.chicken,
    emoji: "🍗",
  },
  {
    id: "fruit",
    label: "Fruit",
    href: "/browse/refrigerated/fruit",
    image: AISLE_IMAGES.fruit,
    emoji: "🍎",
  },
  {
    id: "bread-and-bakery",
    label: "Bakery",
    href: "/browse/dry/bread-and-bakery",
    image: AISLE_IMAGES["bread-and-bakery"],
    emoji: "🍞",
  },
  {
    id: "canned-goods",
    label: "Canned",
    href: "/browse/dry/canned-goods",
    image: AISLE_IMAGES["canned-goods"],
    emoji: "🥫",
  },
  {
    id: "seasonings",
    label: "Sauces",
    href: "/browse/dry/seasonings",
    image: AISLE_IMAGES.seasonings,
    emoji: "🧂",
  },
  {
    id: "seafood",
    label: "Seafood",
    href: "/browse/refrigerated/seafood",
    image: AISLE_IMAGES.seafood,
    emoji: "🦐",
  },
  {
    id: "manual",
    label: "Custom",
    href: "/#manual-item",
    image: AISLE_IMAGES.toiletries,
    emoji: "✍️",
  },
];
