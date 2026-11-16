import {
  CANTEEN_MEAL_PERIODS,
  getActiveMealPeriod,
  getCanteenConfig,
  getNextMealOpeningLabel,
  isCanteenOpenByConfig,
  orderedMealPeriods,
  type MealPeriodId,
} from "@/data/canteen/canteen-config";

export {
  CANTEEN_MEAL_PERIODS,
  getActiveMealPeriod,
  getCanteenConfig,
  getNextMealOpeningLabel,
  isCanteenOpenByConfig,
  orderedMealPeriods,
  type MealPeriodId,
};

export function isBfCanteenOpen(now = new Date()): boolean {
  return isCanteenOpenByConfig("benjamin-franklin", now);
}

export function isCuCafeOpen(now = new Date()): boolean {
  return isCanteenOpenByConfig("cu-cafe", now);
}

export function isShHoCanteenOpen(now = new Date()): boolean {
  return isCanteenOpenByConfig("sh-ho-canteen", now);
}

export function isPaperAndCoffeeOpen(now = new Date()): boolean {
  return isCanteenOpenByConfig("paper-and-coffee", now);
}

export function isSorazenOpen(now = new Date()): boolean {
  return isCanteenOpenByConfig("sorazen", now);
}

export function isNaCanteenOpen(now = new Date()): boolean {
  return isCanteenOpenByConfig("na-canteen", now);
}

export function isSimpleCanteenOpen(
  restaurantId: string,
  now = new Date(),
): boolean | null {
  if (!getCanteenConfig(restaurantId)) return null;
  return isCanteenOpenByConfig(restaurantId, now);
}

/** UC: null when closed (outside hours / Sunday). */
export function getCurrentUcPeriod(now = new Date()): MealPeriodId | null {
  if (!isCanteenOpenByConfig("uc-canteen", now)) return null;
  return getActiveMealPeriod(now);
}

export function getNextUcOpeningLabel(now = new Date()): string {
  return getNextMealOpeningLabel(now);
}

export function closedBannerText(
  restaurantName: string,
  restaurantId: string,
  now = new Date(),
): string {
  const cfg = getCanteenConfig(restaurantId);
  const next = cfg?.mealPeriods
    ? getNextMealOpeningLabel(now)
    : (cfg?.nextOpenFallback ?? "tomorrow");
  return `${restaurantName} is currently closed. Opens at ${next}.`;
}
