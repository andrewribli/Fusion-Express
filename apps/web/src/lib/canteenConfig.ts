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
  | "benjamin-franklin"
  | "cu-cafe"
  | "sh-ho-canteen"
  | "na-canteen"
  | "cc-canteen"
  | "shaw-canteen"
  | "wys"
  | "lws"
  | "chung-chi-tang";

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

/** Open venues first (display order), then coming soon. */
export const CANTEEN_CATALOG: CanteenMeta[] = [
  {
    id: "ebeneezers",
    name: "Ebeneezer's Kebabs & Pizzeria (CUHK)",
    shortName: "Ebeneezer's",
    status: "open",
    collegeId: null,
    menuSource: "data/canteen/ebeneezers-menu.ts",
    hoursLabel: "Mon–Sat 11:00 – 21:00",
  },
  {
    id: "sorazen",
    name: "SoraZen",
    shortName: "SoraZen",
    status: "coming_soon",
    collegeId: null,
    menuSource: "data/canteen/sorazen-menu.ts",
    hoursLabel: "Coming soon",
  },
  {
    id: "paper-and-coffee",
    name: "Paper & Coffee",
    shortName: "Paper & Coffee",
    status: "coming_soon",
    collegeId: null,
    menuSource: "data/canteen/paper-and-coffee-menu.ts",
    hoursLabel: "Coming soon",
  },
  {
    id: "uc-canteen",
    name: "UC Canteen",
    shortName: "UC Canteen",
    status: "coming_soon",
    collegeId: "UC",
    menuSource: "data/canteen/uc-menu.ts",
    hoursLabel: "Coming soon",
  },
  {
    id: "orchid-lodge",
    name: "Orchid Lodge",
    shortName: "Orchid Lodge",
    status: "coming_soon",
    collegeId: "CC",
    menuSource: "data/canteen/orchid-lodge-menu.ts",
    hoursLabel: "Coming soon",
  },
  {
    id: "benjamin-franklin",
    name: "Benjamin Franklin Canteen",
    shortName: "Benjamin Franklin",
    status: "coming_soon",
    collegeId: null,
    menuSource: "data/canteen/bf-menu.ts",
    hoursLabel: "Coming soon",
  },
  {
    id: "cu-cafe",
    name: "CU Cafe",
    shortName: "CU Cafe",
    status: "coming_soon",
    collegeId: null,
    menuSource: "data/canteen/simple-menu.ts (CU_CAFE_MENU)",
    hoursLabel: "Coming soon",
  },
  {
    id: "sh-ho-canteen",
    name: "S.H. Ho College Canteen",
    shortName: "S.H. Ho Canteen",
    status: "coming_soon",
    collegeId: "SHHO",
    menuSource: "data/canteen/simple-menu.ts (SH_HO_MENU)",
    hoursLabel: "Coming soon",
  },
  {
    id: "na-canteen",
    name: "NA Canteen",
    shortName: "NA Canteen",
    status: "coming_soon",
    collegeId: "NA",
    menuSource: "data/canteen/na-menu.ts",
    hoursLabel: "Coming soon",
  },
  {
    id: "cc-canteen",
    name: "CC Canteen",
    shortName: "CC Canteen",
    status: "coming_soon",
    collegeId: "CC",
    menuSource: "(stub)",
    hoursLabel: "Coming soon",
  },
  {
    id: "shaw-canteen",
    name: "Shaw Canteen",
    shortName: "Shaw Canteen",
    status: "coming_soon",
    collegeId: "Shaw",
    menuSource: "(stub)",
    hoursLabel: "Coming soon",
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
