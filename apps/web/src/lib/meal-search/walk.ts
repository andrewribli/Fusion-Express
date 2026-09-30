/**
 * Walk minutes from the student's hall to a canteen.
 *
 * CUHK uses the delivery-graph path cost (distance component on the edges).
 * CityU uses the existing hall surcharge tiers (the distance component on
 * CityU delivery) plus which compound the canteen sits in.
 * No maps API. Same building is 2 minutes. Each graph/tier unit is 3 minutes,
 * so a path cost of 4 is "12 min walk".
 */

import {
  CUHK_COLLEGE_LABELS,
  cuhkDestinationNode,
  cuhkRouteDistance,
  findCuhkDeliveryLocation,
  findHall,
} from "@fusion-express/shared";
import type { MealSearchCampus } from "@/lib/meal-search/types";

/** Minutes per delivery-graph cost unit (not a fee). Cost 4 → 12 min. */
export const WALK_MINUTES_PER_GRAPH_UNIT = 3;
/** Same node / same building. */
export const SAME_BUILDING_WALK_MINUTES = 2;
/**
 * Campus canteens (AC1, Ebeneezer's, AC2, AC3, City Chinese) to the
 * Kowloon Tong residence, before the hall-tier units.
 */
const CITYU_CAMPUS_TO_KLNT_MINUTES = 8;

const CITYU_CAMPUS_CANTEENS = new Set([
  "city-express-ac1",
  "ebeneezers-5380",
  "ac2-canteen",
  "ac3-bistro",
  "city-chinese",
]);

export function minutesFromRouteDistance(raw: number, sameNode: boolean): number {
  if (sameNode || raw <= 0) return SAME_BUILDING_WALK_MINUTES;
  return Math.max(
    SAME_BUILDING_WALK_MINUTES,
    Math.round(raw * WALK_MINUTES_PER_GRAPH_UNIT),
  );
}

export function formatWalkMinutes(minutes: number): string {
  return `${minutes} min walk`;
}

function cuhkHallNode(
  hall: string | null | undefined,
  college: string | null | undefined,
): string | null {
  const trimmed = hall?.trim();
  if (!trimmed) return null;
  const loc = findCuhkDeliveryLocation(trimmed);
  const collegeLabel = loc
    ? CUHK_COLLEGE_LABELS[loc.college]
    : college?.trim() || null;
  const hallName = loc?.name ?? trimmed;
  return cuhkDestinationNode(collegeLabel, hallName);
}

function cityuWalkMinutes(canteenId: string, hall: string): number | null {
  const meta = findHall(hall, "cityu");
  if (!meta) return null;
  const mosHall = meta.id === "cityu-12";
  if (canteenId === "hall-canteen-mos") {
    return mosHall ? SAME_BUILDING_WALK_MINUTES : null;
  }
  // Hall 12 is Ma On Shan — not a walk from Kowloon Tong canteens.
  if (mosHall) return null;
  const units = meta.surcharge ?? 0;
  if (canteenId === "hall-canteen-klnt") {
    return SAME_BUILDING_WALK_MINUTES + units * WALK_MINUTES_PER_GRAPH_UNIT;
  }
  if (CITYU_CAMPUS_CANTEENS.has(canteenId)) {
    return CITYU_CAMPUS_TO_KLNT_MINUTES + units * WALK_MINUTES_PER_GRAPH_UNIT;
  }
  return null;
}

/** True when this campus can show walk times for the stored hall. */
export function distanceAvailable(
  campus: MealSearchCampus,
  hall: string | null | undefined,
  college: string | null | undefined,
): boolean {
  const trimmed = hall?.trim();
  if (!trimmed) return false;
  if (campus === "cuhk") return cuhkHallNode(trimmed, college) != null;
  return findHall(trimmed, "cityu") != null;
}

export function walkMinutesForCanteen(
  campus: MealSearchCampus,
  canteenId: string,
  hall: string | null | undefined,
  college: string | null | undefined,
): number | null {
  const trimmed = hall?.trim();
  if (!trimmed) return null;
  if (campus === "cityu") return cityuWalkMinutes(canteenId, trimmed);

  const dest = cuhkHallNode(trimmed, college);
  if (!dest) return null;
  const route = cuhkRouteDistance(canteenId, dest);
  if (!route) return null;
  return minutesFromRouteDistance(route.raw, route.sameNode);
}
