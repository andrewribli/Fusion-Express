import type { CollegeId } from "@fusion-express/shared/canteen-college";
import { canteenHoursLabel as hoursFromConfig } from "@fusion-express/shared/canteen-hours";

export type RestaurantId =
  | "benjamin-franklin"
  | "uc-canteen"
  | "cu-cafe"
  | "sh-ho-canteen"
  | "paper-and-coffee"
  | "sorazen"
  | "na-canteen"
  | "cafe-tolo"
  | "tuck-shop"
  | "ebenezers"
  | "cc-canteen"
  | "shaw-canteen"
  | "wys-canteen"
  | "maxims"
  | "lws-canteen"
  | "lee-woo-sing-green";

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
  /**
   * Relative campus walk order (lower = closer to University Station / mid-campus).
   * Used as Distance sort when GPS is unavailable.
   */
  campusWalkOrder: number;
};

export const CANTEEN_DELIVERY_FEE = 10;

function hours(id: RestaurantId): string {
  return hoursFromConfig(id);
}

export const RESTAURANTS: Restaurant[] = [
  {
    id: "benjamin-franklin",
    name: "Benjamin Franklin Canteen",
    shortName: "Benjamin Franklin",
    blurb: "Campus canteen classics to your dorm lobby.",
    hoursLabel: hours("benjamin-franklin"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: null,
    menuReady: true,
    logoSrc: "local:benjamin-franklin",
    campusWalkOrder: 20,
  },
  {
    id: "uc-canteen",
    name: "UC Canteen",
    shortName: "UC Canteen",
    blurb: "United College canteen — breakfast to dinner by time zone.",
    hoursLabel: hours("uc-canteen"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "UC",
    menuReady: true,
    logoSrc: "/canteen/cuhk-college-canteen.png",
    campusWalkOrder: 50,
  },
  {
    id: "cu-cafe",
    name: "CU Cafe",
    shortName: "CU Cafe",
    blurb:
      "CUHK members-only cafe at LSK — Thai boat noodles, tea sets, sandwiches, toast, and drinks.",
    location: "Lee Shau Kee Building (LSK) · CUHK members only",
    hoursLabel: hours("cu-cafe"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: null,
    menuReady: true,
    campusWalkOrder: 15,
  },
  {
    id: "sh-ho-canteen",
    name: "S.H. Ho College Canteen",
    shortName: "S.H. Ho Canteen",
    blurb: "The S.H. Ho College canteen serves casual Chinese and Western meals.",
    location: "S.H. Ho College",
    hoursLabel: hours("sh-ho-canteen"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "SHHO",
    menuReady: true,
    logoSrc: "/canteen/cuhk-college-canteen.png",
    campusWalkOrder: 70,
  },
  {
    id: "paper-and-coffee",
    name: "Paper & Coffee",
    shortName: "Paper & Coffee",
    blurb:
      "Premium coffee and Japanese-style teishoku, donburi, and noodles near University Station.",
    location:
      'LG/F, William M.W. Mong Building (near the University Station / "foot of the hill")',
    hoursLabel: hours("paper-and-coffee"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: null,
    menuReady: true,
    logoSrc: "/canteen/paper-and-coffee-logo.png",
    campusWalkOrder: 5,
  },
  {
    id: "sorazen",
    name: "SoraZen",
    shortName: "SoraZen",
    blurb:
      "Japanese-inspired bowls, salads, and hot pots at Benjamin Franklin Centre — breakfast through dinner.",
    location: "Benjamin Franklin Centre, Lower Ground (BFC LG · BFCLG-SORAZEN)",
    hoursLabel: hours("sorazen"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: null,
    menuReady: true,
    logoSrc: "/canteen/sorazen-logo.png",
    campusWalkOrder: 22,
  },
  {
    id: "na-canteen",
    name: "WeBites (New Asia)",
    shortName: "WeBites",
    blurb:
      "WeBites at New Asia — breakfast sets, Rice Noodle Institute lunch, and campus drinks.",
    location: "New Asia College",
    hoursLabel: hours("na-canteen"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "NA",
    menuReady: true,
    logoSrc: "/canteen/cuhk-college-canteen.png",
    campusWalkOrder: 80,
  },
  {
    id: "cafe-tolo",
    name: "Cafe Tolo",
    shortName: "Cafe Tolo",
    blurb:
      "Western all-day breakfast, Spanish bites, waffles, and specialty drinks at Lee Woo Sing College.",
    location: "Lee Woo Sing College (LWS)",
    hoursLabel: hours("cafe-tolo"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "LWS",
    menuReady: true,
    campusWalkOrder: 95,
  },
  {
    id: "tuck-shop",
    name: "Tuck Shop",
    shortName: "Tuck Shop",
    blurb:
      "Campus swimming-pool tuck shop — fish balls, skewers, steamed buns, and sweet soup.",
    location: "CUHK Swimming Pool",
    hoursLabel: hours("tuck-shop"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: null,
    menuReady: true,
    campusWalkOrder: 35,
  },
  {
    id: "ebenezers",
    name: "Ebeneezer's Kebabs & Pizzeria",
    shortName: "Ebeneezer's",
    blurb:
      "Halal kebabs, tikka, curries, and pizza slices at Li Wai Chun Building.",
    location: "G05, Li Wai Chun Building",
    hoursLabel: hours("ebenezers"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: null,
    menuReady: true,
    campusWalkOrder: 40,
  },
  {
    id: "cc-canteen",
    name: "Chung Chi Tang",
    shortName: "Chung Chi Tang",
    blurb:
      "众志堂 at Chung Chi — BBQ, 煎燒扒餐, noodles, afternoon tea, and drinks.",
    location: "Chung Chi College (众志堂)",
    hoursLabel: hours("cc-canteen"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "CC",
    menuReady: true,
    logoSrc: "/canteen/chung-chi-college.png",
    campusWalkOrder: 45,
  },
  {
    id: "shaw-canteen",
    name: "Shaw Canteen",
    shortName: "Shaw Canteen",
    blurb: "Shaw College canteen — rice with dishes and campus staples.",
    location: "Shaw College",
    hoursLabel: hours("shaw-canteen"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "Shaw",
    menuReady: true,
    logoSrc: "/canteen/cuhk-college-canteen.png",
    campusWalkOrder: 60,
  },
  {
    id: "wys-canteen",
    name: "Wee Yu Sun Canteen",
    shortName: "WYS Canteen",
    blurb:
      "伍宜孙书院食堂 / 三湘玥 — Hunan-style rice sets and noodles.",
    location: "Wu Yee Sun College (三湘玥)",
    hoursLabel: hours("wys-canteen"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "WYS",
    menuReady: true,
    logoSrc: "/canteen/cuhk-college-canteen.png",
    campusWalkOrder: 75,
  },
  {
    id: "maxims",
    name: "Maxim's",
    shortName: "Maxim's",
    blurb: "Maxim's by CUHK — basic fast-food rice, noodles, and breakfast.",
    location: "Near CUHK campus",
    hoursLabel: hours("maxims"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: null,
    menuReady: true,
    campusWalkOrder: 10,
  },
  {
    id: "lws-canteen",
    name: "Lee Woo Sing Canteen",
    shortName: "WS Can",
    blurb:
      "和声书院食堂 — pork cartilage rice, fish ball noodles. Cafe Tolo is separate.",
    location: "Lee Woo Sing College",
    hoursLabel: hours("lws-canteen"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "LWS",
    menuReady: true,
    logoSrc: "/canteen/cuhk-college-canteen.png",
    campusWalkOrder: 90,
  },
  {
    id: "lee-woo-sing-green",
    name: "Lee Woo Sing Green",
    shortName: "LWS Green",
    blurb:
      "The Green at Lee Woo Sing — afternoon tea, Chinese BBQ, grill sets, fast food, and campus drinks.",
    location: "Lee Woo Sing College (The Green)",
    hoursLabel: hours("lee-woo-sing-green"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "LWS",
    menuReady: true,
    logoSrc: "/canteen/cuhk-college-canteen.png",
    campusWalkOrder: 92,
  },
];

export function getRestaurant(id: string): Restaurant | undefined {
  return RESTAURANTS.find((r) => r.id === id);
}

export function menuReadyRestaurants(): Restaurant[] {
  return RESTAURANTS.filter((r) => r.menuReady);
}
