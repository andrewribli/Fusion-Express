import type { CollegeId } from "@/data/canteen/colleges";

export type RestaurantId =
  | "benjamin-franklin"
  | "uc-canteen"
  | "na-canteen"
  | "cc-canteen"
  | "shaw-canteen";

export type Restaurant = {
  id: RestaurantId;
  name: string;
  shortName: string;
  blurb: string;
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
