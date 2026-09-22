import {
  UC_MEAL_PERIODS,
  type MealPeriod,
} from "@/data/canteen/uc-menu";

const BF_OPEN_MIN = 7 * 60 + 30;
const BF_CLOSE_MIN = 21 * 60;

function hktParts(now = new Date()): { minutes: number; day: number } {
  const hkt = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" }),
  );
  return {
    minutes: hkt.getHours() * 60 + hkt.getMinutes(),
    // 0 = Sun … 6 = Sat (same as Date#getDay)
    day: hkt.getDay(),
  };
}

function hktMinutes(now = new Date()): number {
  return hktParts(now).minutes;
}

export function isBfCanteenOpen(now = new Date()): boolean {
  const m = hktMinutes(now);
  return m >= BF_OPEN_MIN && m < BF_CLOSE_MIN;
}

/** Mon–Fri inclusive weekday check (HKT). */
function isWeekday(day: number): boolean {
  return day >= 1 && day <= 5;
}

/** Mon–Sat inclusive (HKT). */
function isMonToSat(day: number): boolean {
  return day >= 1 && day <= 6;
}

export function isCuCafeOpen(now = new Date()): boolean {
  const { minutes, day } = hktParts(now);
  if (!isWeekday(day)) return false;
  return minutes >= 8 * 60 && minutes < 18 * 60;
}

export function isShHoCanteenOpen(now = new Date()): boolean {
  const { minutes, day } = hktParts(now);
  if (!isMonToSat(day)) return false;
  return minutes >= 8 * 60 && minutes < 21 * 60;
}

export function isPaperAndCoffeeOpen(now = new Date()): boolean {
  const { minutes, day } = hktParts(now);
  if (!isWeekday(day)) return false;
  return minutes >= 8 * 60 && minutes < 17 * 60;
}

export function isSimpleCanteenOpen(
  restaurantId: string,
  now = new Date(),
): boolean | null {
  if (restaurantId === "cu-cafe") return isCuCafeOpen(now);
  if (restaurantId === "sh-ho-canteen") return isShHoCanteenOpen(now);
  if (restaurantId === "paper-and-coffee") return isPaperAndCoffeeOpen(now);
  return null;
}

export function getCurrentUcPeriod(now = new Date()): MealPeriod | null {
  const m = hktMinutes(now);
  for (const [id, slot] of Object.entries(UC_MEAL_PERIODS) as Array<
    [MealPeriod, (typeof UC_MEAL_PERIODS)[MealPeriod]]
  >) {
    if (m >= slot.startMin && m < slot.endMin) return id;
  }
  return null;
}

export function getNextUcOpeningLabel(now = new Date()): string {
  const m = hktMinutes(now);
  const order: MealPeriod[] = ["breakfast", "lunch", "tea", "dinner"];
  for (const id of order) {
    const slot = UC_MEAL_PERIODS[id];
    if (m < slot.startMin) {
      return `${slot.start} (${slot.label})`;
    }
  }
  return "9:00 AM tomorrow (Breakfast)";
}
