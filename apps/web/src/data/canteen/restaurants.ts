import type { CollegeId } from "@/data/canteen/colleges";

export type RestaurantId =
  | "benjamin-franklin"
  | "uc-canteen"
  | "cu-cafe"
  | "sh-ho-canteen"
  | "paper-and-coffee"
  | "sorazen"
  | "na-canteen"
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
  /** Optional brand mark shown on list cards and canteen headers. */
  logoSrc?: string;
};

export const CANTEEN_DELIVERY_FEE = 10;

export const RESTAURANTS: Restaurant[] = [
  {
    id: "benjamin-franklin",
    name: "Benjamin Franklin Canteen",
    shortName: "Benjamin Franklin",
    blurb: "Campus canteen classics to your dorm lobby.",
    hoursLabel: "7:30 AM – 9:00 PM",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: null,
    menuReady: true,
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
  },
  {
    id: "sorazen",
    name: "SoraZen",
    shortName: "SoraZen",
    blurb:
      "Japanese-inspired bowls, salads, and hot pots at Benjamin Franklin Centre — breakfast through dinner.",
    location:
      "Benjamin Franklin Centre, Lower Ground (BFC LG · BFCLG-SORAZEN)",
    hoursLabel: "7:30 AM – 7:30 PM (Mon–Fri · closed Sat)",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: null,
    menuReady: true,
    logoSrc: "/canteen/sorazen-logo.png",
  },
  {
    id: "na-canteen",
    name: "NA Canteen",
    shortName: "NA Canteen",
    blurb:
      "Bites Bro New Asia Canteen — breakfast sets, Rice Noodle Institute lunch, and campus drinks. College discount when an NA runner picks up.",
    location: "New Asia College",
    hoursLabel: "7:30 AM – 8:00 PM (breakfast · lunch · drinks)",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "NA",
    menuReady: true,
  },
  {
    id: "cc-canteen",
    name: "CC Canteen",
    shortName: "CC Canteen",
    blurb: "Chung Chi College canteen — college discount when a CC runner picks up.",
    hoursLabel: "Coming soon",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "CC",
    menuReady: false,
  },
  {
    id: "shaw-canteen",
    name: "Shaw Canteen",
    shortName: "Shaw Canteen",
    blurb: "Shaw College canteen — college discount when a Shaw runner picks up.",
    hoursLabel: "Coming soon",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "Shaw",
    menuReady: false,
  },
];

export function getRestaurant(id: string): Restaurant | undefined {
  return RESTAURANTS.find((r) => r.id === id);
}
