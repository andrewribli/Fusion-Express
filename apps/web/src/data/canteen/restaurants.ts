import type { CollegeId } from "@/data/canteen/colleges";
import {
  CANTEEN_CATALOG,
  canteenStatus,
  getCanteenMeta,
  type CanteenId,
} from "@/lib/canteenConfig";

export type RestaurantId = CanteenId;

export type Restaurant = {
  id: RestaurantId;
  name: string;
  shortName: string;
  blurb: string;
  location?: string;
  hoursLabel: string;
  deliveryFee: number;
  collegeId: CollegeId | null;
  menuReady: boolean;
  logoSrc?: string;
};

export const CANTEEN_DELIVERY_FEE = 10;

const RESTAURANT_COPY: Record<
  RestaurantId,
  Pick<Restaurant, "blurb" | "location" | "logoSrc">
> = {
  sorazen: {
    blurb:
      "Japanese-inspired bowls, salads, and hot pots at Benjamin Franklin Centre — breakfast through dinner.",
    location:
      "Benjamin Franklin Centre, Lower Ground (BFC LG · BFCLG-SORAZEN)",
    logoSrc: "/canteen/sorazen-logo.png",
  },
  "paper-and-coffee": {
    blurb:
      "Premium coffee and Japanese-style teishoku, donburi, and noodles near University Station.",
    location:
      "LG/F, William M.W. Mong Building (near the University Station / \"foot of the hill\")",
    logoSrc: "/canteen/paper-and-coffee-logo.png",
  },
  "uc-canteen": {
    blurb: "United College canteen — breakfast to dinner by time zone.",
  },
  ebeneezers: {
    blurb:
      "Kebabs, biryani, curry plates, and pizza — FoodPanda pickup menu for CUHK students and staff.",
    location: "Benjamin Franklin Centre (CUHK)",
  },
  "orchid-lodge": {
    blurb: "Chung Chi Orchid Lodge — café and light meals.",
    location: "Orchid Lodge, Chung Chi College",
  },
  "benjamin-franklin": {
    blurb: "Campus canteen classics to your dorm lobby.",
  },
  "cu-cafe": {
    blurb:
      "CU Cafe is a grab-and-go spot for sandwiches, salads, and premium coffee.",
    location: "Lee Shau Kee Building (LSK)",
  },
  "sh-ho-canteen": {
    blurb: "The S.H. Ho College canteen serves casual Chinese and Western meals.",
    location: "S.H. Ho College",
  },
  "na-canteen": {
    blurb:
      "Bites Bro New Asia Canteen — breakfast sets, Rice Noodle Institute lunch, and campus drinks.",
    location: "New Asia College",
  },
  "cc-canteen": {
    blurb: "Chung Chi College canteen — college discount when a CC runner picks up.",
  },
  "shaw-canteen": {
    blurb: "Shaw College canteen — college discount when a Shaw runner picks up.",
  },
  wys: {
    blurb: "Wu Yee Sun College canteen.",
  },
  lws: {
    blurb: "Lee Woo Sing College canteen.",
  },
  "chung-chi-tang": {
    blurb: "Chung Chi Tang dining.",
  },
};

function buildRestaurant(meta: (typeof CANTEEN_CATALOG)[number]): Restaurant {
  const copy = RESTAURANT_COPY[meta.id];
  const open = canteenStatus(meta.id) === "open";
  return {
    id: meta.id,
    name: meta.name,
    shortName: meta.shortName,
    blurb: copy.blurb,
    location: copy.location,
    hoursLabel: open ? meta.hoursLabel : "Coming soon",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: meta.collegeId,
    menuReady: open,
    logoSrc: copy.logoSrc,
  };
}

/** Open canteens first (catalog order), then coming soon. */
export const RESTAURANTS: Restaurant[] = CANTEEN_CATALOG.map(buildRestaurant);

export function getRestaurant(id: string): Restaurant | undefined {
  const meta = getCanteenMeta(id);
  if (!meta) return undefined;
  return buildRestaurant(meta);
}
