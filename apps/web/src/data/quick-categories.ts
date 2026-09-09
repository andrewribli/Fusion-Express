import { AISLE_IMAGES } from "@/data/aisle-images";

export interface QuickCategory {
  id: string;
  label: string;
  href: string;
  image: string;
}

/** Top Excel subcategories for quick browse. */
export const QUICK_CATEGORIES: QuickCategory[] = [
  {
    id: "seasonings",
    label: "Seasonings",
    href: "/browse/dry/seasonings",
    image: AISLE_IMAGES.seasonings,
  },
  {
    id: "tea",
    label: "Tea",
    href: "/browse/dry/tea",
    image: AISLE_IMAGES.tea,
  },
  {
    id: "instant-noodles",
    label: "Instant Noodles",
    href: "/browse/dry/instant-noodles",
    image: AISLE_IMAGES["instant-noodles"],
  },
  {
    id: "toiletries",
    label: "Toiletries",
    href: "/browse/dry/toiletries",
    image: AISLE_IMAGES.toiletries,
  },
  {
    id: "condiments",
    label: "Condiments",
    href: "/browse/dry/condiments",
    image: AISLE_IMAGES.condiments,
  },
  {
    id: "snacks",
    label: "Snacks",
    href: "/browse/dry/snacks",
    image: AISLE_IMAGES.snacks,
  },
  {
    id: "chips",
    label: "Chips",
    href: "/browse/dry/chips",
    image: AISLE_IMAGES.chips,
  },
  {
    id: "rice-noodles",
    label: "Rice & Noodles",
    href: "/browse/dry/rice-noodles",
    image: AISLE_IMAGES["rice-noodles"],
  },
  {
    id: "canned-goods",
    label: "Canned Goods",
    href: "/browse/dry/canned-goods",
    image: AISLE_IMAGES["canned-goods"],
  },
  {
    id: "household",
    label: "Household",
    href: "/browse/dry/household",
    image: AISLE_IMAGES.household,
  },
];
