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
  | "shaw-canteen";

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
    /** Local PD Duplessis portrait — see `src/canteen/images.ts`. */
    logoSrc: "local:benjamin-franklin",
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
  },
  {
    id: "cu-cafe",
    name: "CU Cafe",
    shortName: "CU Cafe",
    blurb:
      "CU Cafe is a grab-and-go spot for sandwiches, salads, and premium coffee.",
    location: "Lee Shau Kee Building (LSK)",
    hoursLabel: hours("cu-cafe"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: null,
    menuReady: true,
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
  },
  {
    id: "cc-canteen",
    name: "CC Canteen",
    shortName: "CC Canteen",
    blurb: "Chung Chi College canteen — coming soon.",
    hoursLabel: hours("cc-canteen"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "CC",
    menuReady: false,
    logoSrc: "/canteen/cuhk-college-canteen.png",
  },
  {
    id: "shaw-canteen",
    name: "Shaw Canteen",
    shortName: "Shaw Canteen",
    blurb: "Shaw College canteen — coming soon.",
    hoursLabel: hours("shaw-canteen"),
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "Shaw",
    menuReady: false,
    logoSrc: "/canteen/cuhk-college-canteen.png",
  },
];

export function getRestaurant(id: string): Restaurant | undefined {
  return RESTAURANTS.find((r) => r.id === id);
}

export function menuReadyRestaurants(): Restaurant[] {
  return RESTAURANTS.filter((r) => r.menuReady);
}
