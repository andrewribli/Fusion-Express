import bfMenu from "../data/canteen/bf-menu.json";
import ucMenu from "../data/canteen/uc-menu.json";
import ebeneezersMenu from "../data/canteen/ebeneezers-menu.json";
import cityExpressMenu from "../data/canteen/cityu-city-express-menu.json";
import restaurantsJson from "../data/canteen/restaurants.json";
import {
  CANTEEN_ITEM_PREFIX,
  canteenItemId,
  type ShopKind,
} from "./shop-kind";
import type { MenuItem } from "./types";

export const CANTEEN_DELIVERY_FEE = 10;

export type CanteenMealZone = "breakfast" | "lunch" | "tea" | "dinner";

export type CanteenCampus = "cuhk" | "cityu";

export const CAMPUS_LABELS: Record<CanteenCampus, string> = {
  cuhk: "CUHK",
  cityu: "CityU",
};

export interface CanteenRestaurant {
  id: string;
  name: string;
  shortName: string;
  blurb: string;
  hoursLabel: string;
  deliveryFee: number;
  collegeId: string | null;
  campus: CanteenCampus;
  logo?: string;
  menuReady: boolean;
}

export interface CanteenMenuItem {
  id: string;
  name: string;
  nameZh?: string;
  description?: string;
  price: number;
  category: string;
  code?: string;
  image?: string;
  vegetarian?: boolean;
  timeZones?: CanteenMealZone[];
}

export const RESTAURANTS = restaurantsJson as CanteenRestaurant[];

export function getRestaurant(id: string): CanteenRestaurant | undefined {
  return RESTAURANTS.find((r) => r.id === id);
}

export function restaurantsByCampus(
  campus: CanteenCampus,
): CanteenRestaurant[] {
  return RESTAURANTS.filter((r) => r.campus === campus);
}

export function getCanteenMenu(restaurantId: string): CanteenMenuItem[] {
  if (restaurantId === "benjamin-franklin") {
    return bfMenu as CanteenMenuItem[];
  }
  if (restaurantId === "uc-canteen") {
    return ucMenu as CanteenMenuItem[];
  }
  if (restaurantId === "cityu-ebeneezers") {
    return ebeneezersMenu as CanteenMenuItem[];
  }
  if (restaurantId === "cityu-city-express") {
    return cityExpressMenu as CanteenMenuItem[];
  }
  return [];
}

export function toCartMenuItemFromCanteen(
  item: CanteenMenuItem,
  restaurantId: string,
): MenuItem {
  const name = item.nameZh ? `${item.name} (${item.nameZh})` : item.name;
  return {
    id: canteenItemId(restaurantId, item.id),
    name,
    category: "other",
    price: item.price,
    unit: "each",
    image: item.image,
    priceType: "fixed",
    runnerInputsPrice: false,
    inStock: true,
    sortOrder: 0,
    weightKg: 0.4,
    itemNote: item.description,
  };
}

/** Flat HK$10 for canteen; Fusion keeps weight/zone fees. */
export function resolveOrderDeliveryFee(
  shopKind: ShopKind,
  opts: {
    weightKg: number;
    college: string;
    calculateFusionFee: (input: {
      weightKg: number;
      college: string;
    }) => {
      baseFee: number;
      weightKg: number;
      extraKg: number;
      weightSurcharge: number;
      zone: 1 | 2 | 3;
      distanceSurcharge: number;
      deliveryFee: number;
    };
  },
) {
  if (shopKind === "canteen") {
    return {
      baseFee: CANTEEN_DELIVERY_FEE,
      weightKg: opts.weightKg,
      extraKg: 0,
      weightSurcharge: 0,
      zone: 1 as const,
      distanceSurcharge: 0,
      deliveryFee: CANTEEN_DELIVERY_FEE,
    };
  }
  return opts.calculateFusionFee({
    weightKg: opts.weightKg,
    college: opts.college,
  });
}

export function cartHasCanteenItems(
  items: { item: { id: string } }[],
): boolean {
  return items.some((line) => line.item.id.startsWith(CANTEEN_ITEM_PREFIX));
}

export function cartHasFusionItems(
  items: { item: { id: string } }[],
): boolean {
  return items.some((line) => !line.item.id.startsWith(CANTEEN_ITEM_PREFIX));
}

export const UC_MEAL_ZONES: Record<
  CanteenMealZone,
  { label: string; start: string; end: string; startMin: number; endMin: number }
> = {
  breakfast: {
    label: "Breakfast",
    start: "9:00 AM",
    end: "11:00 AM",
    startMin: 540,
    endMin: 660,
  },
  lunch: {
    label: "Lunch",
    start: "11:00 AM",
    end: "2:30 PM",
    startMin: 660,
    endMin: 870,
  },
  tea: {
    label: "Tea Time",
    start: "2:30 PM",
    end: "5:00 PM",
    startMin: 870,
    endMin: 1020,
  },
  dinner: {
    label: "Dinner",
    start: "5:00 PM",
    end: "8:30 PM",
    startMin: 1020,
    endMin: 1230,
  },
};

export function currentUcMealZone(
  now = new Date(),
): CanteenMealZone | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  for (const [id, zone] of Object.entries(UC_MEAL_ZONES) as [
    CanteenMealZone,
    (typeof UC_MEAL_ZONES)[CanteenMealZone],
  ][]) {
    if (mins >= zone.startMin && mins < zone.endMin) return id;
  }
  return null;
}
