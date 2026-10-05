import type { CollegeId } from "@/data/canteen/colleges";
import {
  CANTEEN_CATALOG,
  canteenStatus,
  getCanteenMeta,
  type CanteenId,
} from "@/lib/canteenConfig";
import { computeDeliveryFee } from "@fusion-express/shared/delivery-pricing";

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
  /** Logo or college crest shown on the canteen index card. */
  coverImage: string;
};

/**
 * No-hall preview only. Checkout replaces this with the origin graph quote
 * for the selected hall. Do not treat it as the fee for every restaurant.
 */
export const CANTEEN_DELIVERY_FEE = computeDeliveryFee({
  campus: "cuhk",
  sourceId: "sorazen",
}).base;

const RESTAURANT_COPY: Record<
  RestaurantId,
  Pick<Restaurant, "blurb" | "location" | "logoSrc" | "coverImage">
> = {
  sorazen: {
    blurb:
      "Japanese-inspired bowls, salads, and hot pots at Benjamin Franklin Centre — breakfast through dinner.",
    location:
      "Benjamin Franklin Centre, Lower Ground (BFC LG · BFCLG-SORAZEN)",
    logoSrc: "/canteen/sorazen-logo.png",
    coverImage: "/canteen/logos/sorazen.png",
  },
  "paper-and-coffee": {
    blurb:
      "Premium coffee and Japanese-style teishoku, donburi, and noodles near University Station.",
    location:
      "LG/F, William M.W. Mong Building (near the University Station / \"foot of the hill\")",
    logoSrc: "/canteen/logos/paper-and-coffee.png",
    coverImage: "/canteen/logos/paper-and-coffee.png",
  },
  "uc-canteen": {
    blurb: "United College canteen — breakfast to dinner by time zone.",
    coverImage: "/canteen/logos/uc.png",
  },
  ebeneezers: {
    blurb:
      "Kebabs, biryani, curry plates, and pizza — FoodPanda pickup menu for CUHK students and staff.",
    location: "Benjamin Franklin Centre (CUHK)",
    coverImage: "/canteen/logos/ebeneezers.png",
  },
  "orchid-lodge": {
    blurb: "Chung Chi Orchid Lodge — café and light meals.",
    location: "Orchid Lodge, Chung Chi College",
    coverImage: "/canteen/logos/chung-chi.png",
  },
  "benjamin-franklin": {
    blurb: "Campus canteen classics to your dorm lobby.",
    coverImage: "/canteen/logos/benjamin-franklin.jpg",
  },
  "cu-cafe": {
    blurb:
      "CU Cafe is a grab-and-go spot for sandwiches, salads, and premium coffee.",
    location: "Lee Shau Kee Building (LSK)",
    coverImage: "/canteen/logos/cu-cafe.png",
  },
  "sh-ho-canteen": {
    blurb: "The S.H. Ho College canteen serves casual Chinese and Western meals.",
    location: "S.H. Ho College",
    coverImage: "/canteen/logos/sh-ho.png",
  },
  "na-webbites": {
    blurb:
      "NA WebBites at New Asia College — Bites Bro counters, noodles, drinks, and snacks.",
    location: "New Asia College",
    coverImage: "/canteen/logos/na.png",
  },
  "cc-canteen": {
    blurb: "Chung Chi College canteen.",
    coverImage: "/canteen/logos/chung-chi.png",
  },
  "shaw-canteen": {
    blurb: "Shaw College canteen.",
    coverImage: "/canteen/logos/shaw.png",
  },
  wys: {
    blurb: "Wu Yee Sun College canteen.",
    coverImage: "/canteen/logos/wys.png",
  },
  lws: {
    blurb: "Lee Woo Sing College canteen.",
    coverImage: "/canteen/logos/lws.png",
  },
  "chung-chi-tang": {
    blurb: "Chung Chi Tang dining.",
    coverImage: "/canteen/logos/chung-chi.png",
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
    coverImage: copy.coverImage,
  };
}

/** Open canteens first (catalog order), then coming soon. */
export const RESTAURANTS: Restaurant[] = CANTEEN_CATALOG.map(buildRestaurant);

export function getRestaurant(id: string): Restaurant | undefined {
  const meta = getCanteenMeta(id);
  if (!meta) return undefined;
  return buildRestaurant(meta);
}
