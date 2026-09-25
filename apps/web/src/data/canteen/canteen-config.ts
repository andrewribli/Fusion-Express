/**
 * Centralized canteen hours + meal-period windows (HKT).
 * Adding a venue = one entry here; pages/hours helpers read from this map.
 */

export type MealPeriodId = "breakfast" | "lunch" | "tea" | "dinner";

export type MealPeriodWindow = {
  id: MealPeriodId;
  label: string;
  start: string;
  end: string;
  startMin: number;
  endMin: number;
};

/** Shared GraceRun meal slots (user-facing canteen sections). */
export const CANTEEN_MEAL_PERIODS: Record<MealPeriodId, MealPeriodWindow> = {
  breakfast: {
    id: "breakfast",
    label: "Breakfast",
    start: "7:30 AM",
    end: "11:00 AM",
    startMin: 7 * 60 + 30,
    endMin: 11 * 60,
  },
  lunch: {
    id: "lunch",
    label: "Lunch",
    start: "11:00 AM",
    end: "2:30 PM",
    startMin: 11 * 60,
    endMin: 14 * 60 + 30,
  },
  tea: {
    id: "tea",
    label: "Tea Time",
    start: "2:30 PM",
    end: "5:00 PM",
    startMin: 14 * 60 + 30,
    endMin: 17 * 60,
  },
  dinner: {
    id: "dinner",
    label: "Dinner",
    start: "5:00 PM",
    end: "8:45 PM",
    startMin: 17 * 60,
    endMin: 20 * 60 + 45,
  },
};

export type WeekdayRule =
  | "everyday"
  | "mon-fri"
  | "mon-sat"
  | "tue-sun" // e.g. closed Saturday
  | "sun-open"; // allows Sunday even if mon-sat peers are closed

export type CanteenHoursConfig = {
  /** Inclusive open minute-of-day (HKT). */
  openMin: number;
  /** Exclusive close minute-of-day (HKT). */
  closeMin: number;
  weekdays: WeekdayRule;
  /** Human label for banners. */
  hoursLabel: string;
  /** Use meal-period sections (UC-style). */
  mealPeriods: boolean;
  /** Next-open hint when closed outside all periods. */
  nextOpenFallback: string;
};

export const canteenConfig: Record<string, CanteenHoursConfig> = {
  "benjamin-franklin": {
    openMin: 7 * 60 + 30,
    closeMin: 21 * 60,
    weekdays: "everyday",
    hoursLabel: "7:30 AM – 9:00 PM",
    mealPeriods: false,
    nextOpenFallback: "7:30 AM",
  },
  "uc-canteen": {
    openMin: 7 * 60 + 30,
    closeMin: 20 * 60 + 45,
    weekdays: "mon-sat", // closed Sundays
    hoursLabel: "Mon–Sat until 8:45 PM (by meal period · closed Sun)",
    mealPeriods: true,
    nextOpenFallback: "7:30 AM (Breakfast)",
  },
  "sh-ho-canteen": {
    openMin: 8 * 60,
    closeMin: 21 * 60,
    weekdays: "everyday", // open Sundays (exception)
    hoursLabel: "8:00 AM – 9:00 PM (incl. Sundays)",
    mealPeriods: false,
    nextOpenFallback: "8:00 AM",
  },
  "cu-cafe": {
    openMin: 8 * 60,
    closeMin: 18 * 60,
    weekdays: "mon-fri",
    hoursLabel: "8:00 AM – 6:00 PM (Mon–Fri)",
    mealPeriods: false,
    nextOpenFallback: "8:00 AM Monday",
  },
  "paper-and-coffee": {
    openMin: 10 * 60 + 30,
    closeMin: 20 * 60,
    weekdays: "everyday",
    hoursLabel: "Every day 10:30 AM – 8:00 PM",
    mealPeriods: false,
    nextOpenFallback: "10:30 AM",
  },
  sorazen: {
    openMin: 10 * 60,
    closeMin: 20 * 60,
    weekdays: "mon-fri",
    hoursLabel: "Mon–Fri 10:00 AM – 8:00 PM · closed Sat & Sun",
    mealPeriods: true,
    nextOpenFallback: "10:00 AM Monday",
  },
  ebeneezers: {
    openMin: 11 * 60,
    closeMin: 21 * 60,
    weekdays: "mon-sat",
    hoursLabel: "Mon–Sat 11:00 AM – 9:00 PM",
    mealPeriods: false,
    nextOpenFallback: "11:00 AM Monday",
  },
  "orchid-lodge": {
    openMin: 8 * 60,
    closeMin: 20 * 60 + 30,
    weekdays: "mon-fri",
    hoursLabel: "Coming soon",
    mealPeriods: false,
    nextOpenFallback: "TBD",
  },
  wys: {
    openMin: 0,
    closeMin: 0,
    weekdays: "mon-sat",
    hoursLabel: "Coming soon",
    mealPeriods: false,
    nextOpenFallback: "TBD",
  },
  lws: {
    openMin: 0,
    closeMin: 0,
    weekdays: "mon-sat",
    hoursLabel: "Coming soon",
    mealPeriods: false,
    nextOpenFallback: "TBD",
  },
  "chung-chi-tang": {
    openMin: 0,
    closeMin: 0,
    weekdays: "mon-sat",
    hoursLabel: "Coming soon",
    mealPeriods: false,
    nextOpenFallback: "TBD",
  },
  "na-canteen": {
    openMin: 7 * 60 + 30,
    closeMin: 20 * 60,
    weekdays: "mon-sat",
    hoursLabel: "7:30 AM – 8:00 PM (breakfast · lunch · drinks)",
    mealPeriods: true,
    nextOpenFallback: "7:30 AM",
  },
  "cc-canteen": {
    openMin: 7 * 60 + 30,
    closeMin: 20 * 60,
    weekdays: "mon-sat",
    hoursLabel: "Coming soon",
    mealPeriods: false,
    nextOpenFallback: "TBD",
  },
  "shaw-canteen": {
    openMin: 7 * 60 + 30,
    closeMin: 20 * 60,
    weekdays: "mon-sat",
    hoursLabel: "Coming soon",
    mealPeriods: false,
    nextOpenFallback: "TBD",
  },
};

export function getCanteenConfig(id: string): CanteenHoursConfig | null {
  return canteenConfig[id] ?? null;
}

export function hktParts(now = new Date()): { minutes: number; day: number } {
  const hkt = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" }),
  );
  return {
    minutes: hkt.getHours() * 60 + hkt.getMinutes(),
    day: hkt.getDay(), // 0 = Sun
  };
}

function dayAllowed(rule: WeekdayRule, day: number): boolean {
  switch (rule) {
    case "everyday":
    case "sun-open":
      return true;
    case "mon-fri":
      return day >= 1 && day <= 5;
    case "mon-sat":
      return day >= 1 && day <= 6;
    case "tue-sun":
      // Closed Saturday only
      return day !== 6;
    default:
      return true;
  }
}

export function isCanteenOpenByConfig(
  id: string,
  now = new Date(),
): boolean {
  const cfg = getCanteenConfig(id);
  if (!cfg) return false;
  const { minutes, day } = hktParts(now);
  if (!dayAllowed(cfg.weekdays, day)) return false;
  return minutes >= cfg.openMin && minutes < cfg.closeMin;
}

export function getActiveMealPeriod(
  now = new Date(),
): MealPeriodId | null {
  const { minutes } = hktParts(now);
  for (const period of Object.values(CANTEEN_MEAL_PERIODS)) {
    if (minutes >= period.startMin && minutes < period.endMin) {
      return period.id;
    }
  }
  return null;
}

export function getNextMealOpeningLabel(now = new Date()): string {
  const { minutes, day } = hktParts(now);
  const order: MealPeriodId[] = ["breakfast", "lunch", "tea", "dinner"];
  for (const id of order) {
    const slot = CANTEEN_MEAL_PERIODS[id];
    if (minutes < slot.startMin) {
      return `${slot.start} (${slot.label})`;
    }
  }
  // After dinner — next breakfast
  if (day === 6) return "7:30 AM Monday (Breakfast)"; // Sat night → skip Sun for mon-sat venues
  return "7:30 AM tomorrow (Breakfast)";
}

export function orderedMealPeriods(
  active: MealPeriodId | null,
): MealPeriodId[] {
  const all: MealPeriodId[] = ["breakfast", "lunch", "tea", "dinner"];
  if (!active) return all;
  return [active, ...all.filter((id) => id !== active)];
}
