import type { CollegeId } from "@/data/canteen/colleges";

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
  | "lws-canteen";

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
  /** Optional brand mark shown on list cards and canteen headers. */
  logoSrc?: string;
  /**
   * Relative campus walk order (lower = closer to University Station / mid-campus).
   * Used as Distance sort when GPS is unavailable.
   */
  campusWalkOrder: number;
};

export const CANTEEN_DELIVERY_FEE = 10;

export const RESTAURANTS: Restaurant[] = [
  {
    id: "benjamin-franklin",
    name: "Benjamin Franklin Canteen",
    shortName: "Benjamin Franklin",
    blurb: "Campus canteen classics to your dorm lobby.",
    hoursLabel: "7:30 AM – 9:00 PM daily",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: null,
    menuReady: true,
    logoSrc: "/canteen/benjamin-franklin.jpg",
    campusWalkOrder: 20,
  },
  {
    id: "uc-canteen",
    name: "UC Canteen",
    shortName: "UC Canteen",
    blurb: "United College canteen — breakfast to dinner by time zone.",
    hoursLabel: "7:30 AM – 7:30 PM (by meal period · closed Sun)",
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
      "CU Cafe is a grab-and-go spot for sandwiches, salads, and premium coffee.",
    location: "Lee Shau Kee Building (LSK)",
    hoursLabel: "8:00 AM – 6:00 PM (Mon–Fri)",
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
    hoursLabel: "8:00 AM – 9:00 PM (incl. Sundays)",
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
      "LG/F, William M.W. Mong Building (near the University Station / \"foot of the hill\")",
    hoursLabel: "10:30 AM – 5:30 PM (Mon–Fri)",
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
    location:
      "Benjamin Franklin Centre, Lower Ground (BFC LG · BFCLG-SORAZEN)",
    hoursLabel: "7:30 AM – 7:30 PM (Mon–Fri · closed Sat–Sun)",
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
      "WeBites at New Asia — breakfast sets, Rice Noodle Institute lunch, and campus drinks. College discount when an NA runner picks up.",
    location: "New Asia College",
    hoursLabel: "7:30 AM – 8:00 PM (Mon–Sat · closed Sun)",
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
      "Western all-day breakfast, Spanish bites, waffles, and specialty drinks at Lee Woo Sing College. College discount when an LWS runner picks up.",
    location: "Lee Woo Sing College (LWS)",
    hoursLabel: "10:00 AM – 7:00 PM daily",
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
    hoursLabel: "10:00 AM – 7:00 PM daily",
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
    hoursLabel: "10:00 AM – 8:00 PM (Mon–Sat · closed Sun/PH)",
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
      "众志堂 at Chung Chi — BBQ pork rice, curry beef rice, sandwiches. College discount when a CC runner picks up.",
    location: "Chung Chi College (众志堂)",
    hoursLabel: "7:30 AM – 8:00 PM (Mon–Sat · closed Sun)",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "CC",
    menuReady: true,
    logoSrc: "/canteen/cuhk-college-canteen.png",
    campusWalkOrder: 45,
  },
  {
    id: "shaw-canteen",
    name: "Shaw Canteen",
    shortName: "Shaw Canteen",
    blurb: "Shaw College canteen — rice with dishes and campus staples.",
    location: "Shaw College",
    hoursLabel: "7:30 AM – 8:00 PM (Mon–Sat · closed Sun)",
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
      "伍宜孙书院食堂 / 三湘玥 — Hunan-style rice sets and noodles. College discount when a WYS runner picks up.",
    location: "Wu Yee Sun College (三湘玥)",
    hoursLabel: "11:00 AM – 9:00 PM (Mon–Sat · closed Sun)",
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
    hoursLabel: "7:30 AM – 9:00 PM daily",
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
      "和声书院食堂 — pork cartilage rice, fish ball noodles, and rice with dishes. Cafe Tolo is listed separately.",
    location: "Lee Woo Sing College",
    hoursLabel: "7:30 AM – 8:00 PM (Mon–Sat · closed Sun)",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "LWS",
    menuReady: true,
    logoSrc: "/canteen/cuhk-college-canteen.png",
    campusWalkOrder: 90,
  },
];

export function getRestaurant(id: string): Restaurant | undefined {
  return RESTAURANTS.find((r) => r.id === id);
}
