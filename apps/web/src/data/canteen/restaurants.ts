import type { CollegeId } from "@/data/canteen/colleges";

export type RestaurantId =
  | "benjamin-franklin"
  | "uc-canteen"
  | "cu-cafe"
  | "sh-ho-canteen"
  | "paper-and-coffee"
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
    hoursLabel: "9:00 AM – 8:30 PM (by meal period)",
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
    hoursLabel: "8:00 AM – 9:00 PM (Mon–Sat)",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "SHHO",
    menuReady: true,
  },
  {
    id: "paper-and-coffee",
    name: "Paper & Coffee",
    shortName: "Paper & Coffee",
    blurb:
      "Paper & Coffee is a popular spot for premium coffee and Japanese-style rice bowls. Famous for its signature House Brew and Fried Chicken.",
    location:
      "LG/F, William M.W. Mong Building (near the University Station / \"foot of the hill\")",
    hoursLabel: "8:00 AM – 5:00 PM (Mon–Fri)",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: null,
    menuReady: true,
  },
  {
    id: "na-canteen",
    name: "NA Canteen",
    shortName: "NA Canteen",
    blurb: "New Asia College canteen — college discount when an NA runner picks up.",
    hoursLabel: "Coming soon",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "NA",
    menuReady: false,
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
