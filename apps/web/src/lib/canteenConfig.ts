/**
 * CUHK canteen catalog — single source of truth for status, hours, and menu wiring.
 * Adding a venue = one entry here (+ menu file + restaurants list entry).
 *
 * Prefer importing from `@/lib/canteenConfig` in app code. Hours math lives in
 * `@/lib/openingHours` (Asia/Hong_Kong only).
 */

import {
  canteenConfig as hoursById,
  type CanteenHoursConfig,
  type WeekdayRule,
} from "@/data/canteen/canteen-config";
import type { CollegeId } from "@/data/canteen/colleges";

export type CanteenStatus = "open" | "coming_soon" | "hidden";

export type CanteenId =
  | "sorazen"
  | "paper-and-coffee"
  | "uc-canteen"
  | "ebeneezers"
  | "orchid-lodge"
  | "wys"
  | "lws"
  | "chung-chi-tang"
  | "benjamin-franklin"
  | "cu-cafe"
  | "sh-ho-canteen"
  | "na-canteen"
  | "cc-canteen"
  | "shaw-canteen";

export type CanteenMeta = {
  id: CanteenId;
  name: string;
  shortName: string;
  status: CanteenStatus;
  collegeId: CollegeId | null;
  /** Where the TypeScript menu lives (for docs / seed scripts). */
  menuSource: string;
  hoursLabel: string;
};

/**
 * Launch set: five open + three coming soon.
 * Legacy venues (BF, CU Cafe, SH Ho, NA) stay open for existing links.
 */
export const CANTEEN_CATALOG: CanteenMeta[] = [
  {
    id: "sorazen",
    name: "SoraZen",
    shortName: "SoraZen",
    status: "open",
    collegeId: null,
    menuSource: "data/canteen/sorazen-menu.ts",
    hoursLabel: "Mon–Fri 10:00 – 20:00 · closed Sat & Sun",
  },
  {
    id: "paper-and-coffee",
    name: "Paper & Coffee",
    shortName: "Paper & Coffee",
    status: "open",
    collegeId: null,
    menuSource: "data/canteen/paper-and-coffee-menu.ts",
    hoursLabel: "Every day 10:30 – 20:00",
  },
  {
    id: "uc-canteen",
    name: "UC Canteen",
    shortName: "UC Can",
    status: "open",
    collegeId: "UC",
    menuSource: "data/canteen/uc-menu.ts",
    hoursLabel: "Mon–Sat until 20:45 · closed Sunday",
  },
  {
    id: "ebeneezers",
    name: "Ebeneezer's Kebabs & Pizzeria (CUHK)",
    shortName: "Ebeneezer's",
    status: "open",
    collegeId: null,
    menuSource: "data/canteen/ebeneezers-menu.ts",
    /** CONFIRM — FoodPanda listing had no published hours when scraped. */
    hoursLabel: "Mon–Sat 11:00 – 21:00 (provisional · confirm with venue)",
  },
  {
    id: "orchid-lodge",
    name: "Orchid Lodge",
    shortName: "Orchid Lodge",
    status: "open",
    collegeId: "CC",
    menuSource: "data/canteen/orchid-lodge-menu.ts",
    hoursLabel: "Mon–Fri 08:00 – 20:30 · Sat 07:30 – 17:00 · closed Sun",
  },
  {
    id: "wys",
    name: "WYS (Wu Yee Sun Canteen)",
    shortName: "WYS",
    status: "coming_soon",
    collegeId: "WYS",
    menuSource: "(stub)",
    hoursLabel: "Coming soon",
  },
  {
    id: "lws",
    name: "LWS (Lee Woo Sing Canteen)",
    shortName: "LWS",
    status: "coming_soon",
    collegeId: null,
    menuSource: "(stub)",
    hoursLabel: "Coming soon",
  },
  {
    id: "chung-chi-tang",
    name: "Chung Chi Tang",
    shortName: "Chung Chi Tang",
    status: "coming_soon",
    collegeId: "CC",
    menuSource: "(stub)",
    hoursLabel: "Coming soon",
  },
];

export function getCanteenMeta(id: string): CanteenMeta | undefined {
  return CANTEEN_CATALOG.find((c) => c.id === id);
}

export function canteenStatus(id: string): CanteenStatus {
  return getCanteenMeta(id)?.status ?? "hidden";
}

export function isOrderableCanteen(id: string): boolean {
  return canteenStatus(id) === "open";
}

export function hoursConfigFor(id: string): CanteenHoursConfig | null {
  return hoursById[id] ?? null;
}

export type { CanteenHoursConfig, WeekdayRule };
