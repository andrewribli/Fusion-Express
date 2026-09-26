import { hktParts } from "@/data/canteen/canteen-config";
import { isOrderableCanteen } from "@/lib/canteenConfig";
import { isOpen } from "@/lib/openingHours";
import { isOrderableRestaurant } from "@/ptero/config/canteen/restaurants";
import type { MealSearchCampus } from "@/lib/meal-search/types";

/**
 * Whether a canteen is currently accepting orders (hours + not coming soon).
 * CUHK uses existing `isOpen()`. CityU uses menuReady + HKT weekday/hours
 * inferred from restaurant labels (no shared isOpen ids for CityU).
 */
export function isCanteenOpenNow(
  campus: MealSearchCampus,
  canteenId: string,
  date: Date = new Date(),
): boolean {
  if (campus === "cuhk") {
    return isOpen(canteenId, date);
  }

  if (!isOrderableRestaurant(canteenId)) return false;

  const { minutes, day } = hktParts(date);
  // CityU canteens: Closed Sun & PH (PH not modeled — Sunday only).
  if (day === 0) return false;

  if (canteenId === "ebeneezers-5380") {
    // Mon–Sat 10:00 AM – 8:00 PM
    return minutes >= 10 * 60 && minutes < 20 * 60;
  }

  if (canteenId === "city-express-ac1") {
    // Mon–Sat campus hours — approximate 08:00–21:00
    return minutes >= 8 * 60 && minutes < 21 * 60;
  }

  return false;
}

/** Coming-soon / hidden venues are never orderable (cannot open menu from search). */
export function isCanteenOrderable(
  campus: MealSearchCampus,
  canteenId: string,
): boolean {
  if (campus === "cuhk") return isOrderableCanteen(canteenId);
  return isOrderableRestaurant(canteenId);
}
