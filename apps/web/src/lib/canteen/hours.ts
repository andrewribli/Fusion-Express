import {
  CANTEEN_MEAL_PERIODS,
  getActiveMealPeriod,
  getCanteenConfig,
  getNextMealOpeningLabel,
  orderedMealPeriods,
  type MealPeriodId,
} from "@/data/canteen/canteen-config";
import { closedBanner, isOpen } from "@/lib/openingHours";

export {
  CANTEEN_MEAL_PERIODS,
  getActiveMealPeriod,
  getCanteenConfig,
  getNextMealOpeningLabel,
  orderedMealPeriods,
  type MealPeriodId,
};

export function isBfCanteenOpen(now = new Date()): boolean {
  return isOpen("benjamin-franklin", now);
}

export function isCuCafeOpen(now = new Date()): boolean {
  return isOpen("cu-cafe", now);
}

export function isShHoCanteenOpen(now = new Date()): boolean {
  return isOpen("sh-ho-canteen", now);
}

export function isPaperAndCoffeeOpen(now = new Date()): boolean {
  return isOpen("paper-and-coffee", now);
}

export function isSorazenOpen(now = new Date()): boolean {
  return isOpen("sorazen", now);
}

export function isNaCanteenOpen(now = new Date()): boolean {
  return isOpen("na-canteen", now);
}

export function isSimpleCanteenOpen(
  restaurantId: string,
  now = new Date(),
): boolean | null {
  if (!getCanteenConfig(restaurantId)) return null;
  return isOpen(restaurantId, now);
}

/** UC: null when closed (outside hours / Sunday / coming soon). */
export function getCurrentUcPeriod(now = new Date()): MealPeriodId | null {
  if (!isOpen("uc-canteen", now)) return null;
  return getActiveMealPeriod(now);
}

export function getNextUcOpeningLabel(now = new Date()): string {
  return getNextMealOpeningLabel(now);
}

export function closedBannerText(
  _restaurantName: string,
  restaurantId: string,
  now = new Date(),
): string {
  return closedBanner(restaurantId, now);
}
