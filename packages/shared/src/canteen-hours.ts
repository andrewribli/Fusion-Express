/**
 * Shared canteen open/close windows (HKT).
 * Web + mobile must use this for ordering gates — keep FORCE flag false.
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
    start: "8:00 AM",
    end: "11:00 AM",
    startMin: 8 * 60,
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
    end: "9:00 PM",
    startMin: 17 * 60,
    /** Upper bound for period filtering; venue close still gates ordering. */
    endMin: 21 * 60,
  },
};

export type WeekdayRule =
  | "everyday"
  | "mon-fri"
  | "mon-sat"
  | "tue-sun" // closed Saturday
  | "sun-open";

export type CanteenHoursConfig = {
  /** Inclusive open minute-of-day (HKT). */
  openMin: number;
  /** Exclusive close minute-of-day (HKT). */
  closeMin: number;
  weekdays: WeekdayRule;
  /** Human label for cards / banners. */
  hoursLabel: string;
  /** Use meal-period sections (UC-style). */
  mealPeriods: boolean;
  /** Next-open hint when closed outside hours. */
  nextOpenFallback: string;
};

/**
 * Hours sourced from CUHK canteen listings / venue pages / printed menus.
 * FORCE_CANTEENS_OPEN_FOR_RECORDING must stay false in production.
 */
export const canteenConfig: Record<string, CanteenHoursConfig> = {
  "benjamin-franklin": {
    openMin: 7 * 60 + 30,
    closeMin: 21 * 60,
    weekdays: "everyday",
    hoursLabel: "7:30 AM – 9:00 PM daily",
    mealPeriods: false,
    nextOpenFallback: "7:30 AM",
  },
  "uc-canteen": {
    openMin: 7 * 60 + 30,
    closeMin: 19 * 60 + 30,
    weekdays: "mon-sat",
    hoursLabel: "7:30 AM – 7:30 PM (by meal period · closed Sun)",
    mealPeriods: true,
    nextOpenFallback: "7:30 AM (Breakfast)",
  },
  "sh-ho-canteen": {
    openMin: 8 * 60,
    closeMin: 21 * 60,
    weekdays: "everyday",
    hoursLabel: "8:00 AM – 9:00 PM (incl. Sundays)",
    mealPeriods: true,
    nextOpenFallback: "8:00 AM",
  },
  "cu-cafe": {
    openMin: 8 * 60,
    closeMin: 18 * 60,
    weekdays: "mon-fri",
    hoursLabel: "8:00 AM – 6:00 PM (Mon–Fri)",
    mealPeriods: true,
    nextOpenFallback: "8:00 AM Monday",
  },
  "paper-and-coffee": {
    openMin: 10 * 60 + 30,
    closeMin: 17 * 60 + 30,
    weekdays: "mon-fri",
    hoursLabel: "10:30 AM – 5:30 PM (Mon–Fri)",
    mealPeriods: false,
    nextOpenFallback: "10:30 AM Monday",
  },
  sorazen: {
    openMin: 7 * 60 + 30,
    closeMin: 19 * 60 + 30,
    weekdays: "mon-fri",
    hoursLabel: "7:30 AM – 7:30 PM (Mon–Fri · closed Sat–Sun)",
    mealPeriods: true,
    nextOpenFallback: "7:30 AM Monday",
  },
  "na-canteen": {
    openMin: 7 * 60 + 30,
    closeMin: 20 * 60,
    weekdays: "mon-sat",
    hoursLabel: "7:30 AM – 8:00 PM (Mon–Sat · closed Sun)",
    mealPeriods: true,
    nextOpenFallback: "7:30 AM",
  },
  "cafe-tolo": {
    openMin: 10 * 60,
    closeMin: 19 * 60,
    weekdays: "everyday",
    hoursLabel: "10:00 AM – 7:00 PM daily",
    mealPeriods: false,
    nextOpenFallback: "10:00 AM",
  },
  "tuck-shop": {
    openMin: 10 * 60,
    closeMin: 19 * 60,
    weekdays: "everyday",
    hoursLabel: "10:00 AM – 7:00 PM daily",
    mealPeriods: false,
    nextOpenFallback: "10:00 AM",
  },
  ebenezers: {
    openMin: 10 * 60,
    closeMin: 20 * 60,
    weekdays: "mon-sat",
    hoursLabel: "10:00 AM – 8:00 PM (Mon–Sat · closed Sun/PH)",
    mealPeriods: false,
    nextOpenFallback: "10:00 AM Monday",
  },
  "cc-canteen": {
    openMin: 7 * 60 + 30,
    closeMin: 20 * 60,
    weekdays: "mon-sat",
    hoursLabel: "7:30 AM – 8:00 PM (Mon–Sat · closed Sun)",
    mealPeriods: true,
    nextOpenFallback: "7:30 AM",
  },
  "shaw-canteen": {
    openMin: 7 * 60 + 30,
    closeMin: 20 * 60,
    weekdays: "mon-sat",
    hoursLabel: "7:30 AM – 8:00 PM (Mon–Sat · closed Sun)",
    mealPeriods: false,
    nextOpenFallback: "7:30 AM",
  },
  "wys-canteen": {
    openMin: 11 * 60,
    closeMin: 21 * 60,
    weekdays: "mon-sat",
    hoursLabel: "11:00 AM – 9:00 PM (Mon–Sat · closed Sun)",
    mealPeriods: false,
    nextOpenFallback: "11:00 AM",
  },
  maxims: {
    openMin: 7 * 60 + 30,
    closeMin: 21 * 60,
    weekdays: "everyday",
    hoursLabel: "7:30 AM – 9:00 PM daily",
    mealPeriods: false,
    nextOpenFallback: "7:30 AM",
  },
  "lws-canteen": {
    openMin: 7 * 60 + 30,
    closeMin: 20 * 60,
    weekdays: "mon-sat",
    hoursLabel: "7:30 AM – 8:00 PM (Mon–Sat · closed Sun)",
    mealPeriods: false,
    nextOpenFallback: "7:30 AM",
  },
  "lee-woo-sing-green": {
    openMin: 10 * 60,
    closeMin: 20 * 60,
    weekdays: "mon-sat",
    hoursLabel: "10:00 AM – 8:00 PM (Mon–Sat · closed Sun)",
    mealPeriods: false,
    nextOpenFallback: "10:00 AM",
  },
};

/** TEMP recording override — MUST remain false for live ordering. */
const FORCE_CANTEENS_OPEN_FOR_RECORDING = false;

export function getCanteenConfig(id: string): CanteenHoursConfig | null {
  return canteenConfig[id] ?? null;
}

/**
 * HKT clock parts via Intl (Hermes-safe).
 * Do NOT use `new Date(toLocaleString(...))` — that yields Invalid Date / NaN
 * on React Native and produced "Opens at 7:30 AM undefined".
 */
export function hktParts(now = new Date()): { minutes: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Hong_Kong",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const hourRaw = Number(parts.find((p) => p.type === "hour")?.value ?? NaN);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? NaN);
  const hour = hourRaw === 24 ? 0 : hourRaw;
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "";
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const day = dayMap[wd];

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    day === undefined
  ) {
    // Device-local fallback beats cascading NaN → "undefined" in banners.
    return {
      minutes: now.getHours() * 60 + now.getMinutes(),
      day: now.getDay(),
    };
  }

  return { minutes: hour * 60 + minute, day };
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
      return day !== 6;
    default:
      return true;
  }
}

function nextAllowedDay(rule: WeekdayRule, fromDay: number): number {
  for (let i = 1; i <= 7; i++) {
    const d = (fromDay + i) % 7;
    if (dayAllowed(rule, d)) return d;
  }
  return (fromDay + 1) % 7;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatOpenClock(openMin: number): string {
  const h = Math.floor(openMin / 60);
  const m = openMin % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}:00 ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function isCanteenOpenByConfig(
  id: string,
  now = new Date(),
): boolean {
  if (FORCE_CANTEENS_OPEN_FOR_RECORDING) return Boolean(getCanteenConfig(id));
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
  if (day === 6) return "7:30 AM Monday (Breakfast)";
  return "7:30 AM tomorrow (Breakfast)";
}

export function getNextOpenLabel(
  restaurantId: string,
  now = new Date(),
): string {
  const cfg = getCanteenConfig(restaurantId);
  if (!cfg) return "tomorrow";

  const { minutes, day } = hktParts(now);
  const clock = formatOpenClock(cfg.openMin);

  // Still today: weekday allowed and before open (or before next meal slot).
  if (dayAllowed(cfg.weekdays, day)) {
    if (cfg.mealPeriods) {
      const order: MealPeriodId[] = ["breakfast", "lunch", "tea", "dinner"];
      for (const id of order) {
        const slot = CANTEEN_MEAL_PERIODS[id];
        if (minutes < slot.startMin) {
          return `${slot.start} (${slot.label})`;
        }
      }
    } else if (minutes < cfg.openMin) {
      return clock;
    }
  }

  const nextDay = nextAllowedDay(cfg.weekdays, day);
  const namedDay = DAY_NAMES[nextDay];
  const dayLabel =
    nextDay === (day + 1) % 7
      ? "tomorrow"
      : namedDay ?? "tomorrow";
  if (cfg.mealPeriods) {
    return `${clock} ${dayLabel} (Breakfast)`;
  }
  return `${clock} ${dayLabel}`;
}

export function closedBannerText(
  restaurantName: string,
  restaurantId: string,
  now = new Date(),
): string {
  const next = getNextOpenLabel(restaurantId, now)
    .replace(/\bundefined\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const openHint = next || getCanteenConfig(restaurantId)?.nextOpenFallback || "tomorrow";
  return `${restaurantName} is currently closed. Opens at ${openHint}.`;
}

export function orderedMealPeriods(
  active: MealPeriodId | null,
): MealPeriodId[] {
  const all: MealPeriodId[] = ["breakfast", "lunch", "tea", "dinner"];
  if (!active) return all;
  return [active, ...all.filter((id) => id !== active)];
}

export function canteenHoursLabel(restaurantId: string): string {
  return getCanteenConfig(restaurantId)?.hoursLabel ?? "Hours TBD";
}
