import type { CollegeId } from "@/ptero/config/canteen/colleges";

/** Flat canteen delivery fee — same as CUHK GraceRun Canteen. */
export const CANTEEN_DELIVERY_FEE = 10;

export type RestaurantId =
  | "city-express-ac1"
  | "ac2-canteen"
  | "ac3-bistro"
  | "hall-canteen-klnt"
  | "hall-canteen-mos"
  | "city-chinese";

export type Restaurant = {
  id: RestaurantId;
  /** Future multi-campus key — always cityu in this deployment. */
  campus: "cityu";
  name: string;
  shortName: string;
  href: string;
  blurb: string;
  cuisine: string;
  location: string;
  hoursLabel: string;
  pickupLabel: string;
  deliveryFee: number;
  /** Residence affiliation for student discount. null = no college discount. */
  collegeId: CollegeId | null;
  menuReady: boolean;
  /** Organize menu by Breakfast / Lunch / Tea / Dinner. */
  useMealPeriods: boolean;
};

export const RESTAURANTS: Restaurant[] = [
  {
    id: "city-express-ac1",
    campus: "cityu",
    name: "City Express (AC1)",
    shortName: "City Express",
    href: "/cityu/canteen/city-express-ac1",
    blurb: "Fast food classics from the Amenities Building.",
    cuisine: "Fast Food",
    location: "5/F, Amenities Building",
    hoursLabel: "07:30–21:00",
    pickupLabel: "City Express (AC1)",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: null,
    menuReady: true,
    useMealPeriods: true,
  },
  {
    id: "ac2-canteen",
    campus: "cityu",
    name: "AC2 Canteen",
    shortName: "AC2 Canteen",
    href: "/cityu/canteen/ac2-canteen",
    blurb: "Fast food by meal period in Li Dak Sum Yip Yio Chin Academic Building.",
    cuisine: "Fast Food",
    location: "3/F, Li Dak Sum Yip Yio Chin Academic Building",
    hoursLabel: "07:30–21:00",
    pickupLabel: "AC2 Canteen",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: null,
    menuReady: true,
    useMealPeriods: true,
  },
  {
    id: "ac3-bistro",
    campus: "cityu",
    name: "AC3 Bistro",
    shortName: "AC3 Bistro",
    href: "/cityu/canteen/ac3-bistro",
    blurb: "Western bites on Lau Ming Wai Academic Building.",
    cuisine: "Western",
    location: "7/F, Lau Ming Wai Academic Building",
    hoursLabel: "07:30–21:00 (Mon–Sat)",
    pickupLabel: "AC3 Bistro",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: null,
    menuReady: true,
    useMealPeriods: true,
  },
  {
    id: "hall-canteen-klnt",
    campus: "cityu",
    name: "Hall Canteen @KLNT",
    shortName: "KLNT Hall Canteen",
    href: "/cityu/canteen/hall-canteen-klnt",
    blurb: "Café and fast food at Kowloon Tong Student Residence — 10% off with a KLNT runner.",
    cuisine: "Café/Fast Food",
    location: "Kowloon Tong Student Residence",
    hoursLabel: "08:00–22:00",
    pickupLabel: "Hall Canteen @KLNT",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "KLNT",
    menuReady: true,
    useMealPeriods: true,
  },
  {
    id: "hall-canteen-mos",
    campus: "cityu",
    name: "Hall Canteen @MOS",
    shortName: "MOS Hall Canteen",
    href: "/cityu/canteen/hall-canteen-mos",
    blurb: "Ma On Shan residence canteen — 10% off when a MOS runner accepts.",
    cuisine: "Café/Fast Food",
    location: "Ma On Shan Student Residence",
    hoursLabel: "09:00–20:00 (Mon–Fri), 09:00–18:00 (Sat)",
    pickupLabel: "Hall Canteen @MOS",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: "MOS",
    menuReady: true,
    useMealPeriods: true,
  },
  {
    id: "city-chinese",
    campus: "cityu",
    name: "City Chinese Restaurant",
    shortName: "City Chinese",
    href: "/cityu/canteen/city-chinese",
    blurb: "Dim sum and Cantonese favourites on the Amenities Building.",
    cuisine: "Dim Sum/Cantonese",
    location: "8/F, Amenities Building",
    hoursLabel: "11:00–22:30",
    pickupLabel: "City Chinese",
    deliveryFee: CANTEEN_DELIVERY_FEE,
    collegeId: null,
    menuReady: true,
    useMealPeriods: false,
  },
];

export function getRestaurant(id: RestaurantId | string): Restaurant | undefined {
  return RESTAURANTS.find((r) => r.id === id);
}

export function canteenCollegeForRestaurant(
  restaurantId: string | null | undefined,
): CollegeId | null {
  if (!restaurantId) return null;
  return getRestaurant(restaurantId)?.collegeId ?? null;
}
