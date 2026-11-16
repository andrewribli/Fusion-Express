/**
 * Web re-exports shared canteen hours so mobile + web stay in lockstep.
 * Source of truth: `@fusion-express/shared/canteen-hours`.
 */
export {
  CANTEEN_MEAL_PERIODS,
  canteenConfig,
  canteenHoursLabel,
  closedBannerText,
  getActiveMealPeriod,
  getCanteenConfig,
  getNextMealOpeningLabel,
  getNextOpenLabel,
  hktParts,
  isCanteenOpenByConfig,
  orderedMealPeriods,
  type CanteenHoursConfig,
  type MealPeriodId,
  type MealPeriodWindow,
  type WeekdayRule,
} from "@fusion-express/shared/canteen-hours";
