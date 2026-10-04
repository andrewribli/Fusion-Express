import type { CampusId } from "./campus";
import {
  buildCuhkCollegeHalls,
  findCuhkDeliveryLocation,
  migrateCuhkCollegeLabel,
} from "./deliveryLocations";

/**
 * CUHK college → hall names for the delivery picker.
 * Source of truth: `CUHK_DELIVERY_LOCATIONS` in deliveryLocations.ts.
 *
 * Chung Chi does not include International House — I-House is split into
 * "I-House 1/2" and "I-House 3/4/5". United College includes Choi Kai Yau Residence.
 */
export const CUHK_COLLEGE_HALLS: Readonly<
  Record<string, readonly string[]>
> = buildCuhkCollegeHalls();

export { migrateCuhkCollegeLabel };

/**
 * CityU halls 1–12 in two compounds.
 * Kowloon Tong is next to Festival Walk (Taste); Ma On Shan is farther.
 */
export const CITYU_COMPOUNDS = {
  "Kowloon Tong Compound": [
    "Hall 1",
    "Hall 2",
    "Hall 3",
    "Hall 4",
    "Hall 5",
    "Hall 6",
    "Hall 7",
    "Hall 8",
    "Hall 9",
    "Hall 10",
    "Hall 11",
  ],
  "Ma On Shan Compound": ["Hall 12"],
} as const;

export type CuhkCollege = keyof typeof CUHK_COLLEGE_HALLS;
export type CityUCompound = keyof typeof CITYU_COMPOUNDS;

export const CUHK_COLLEGES = Object.keys(CUHK_COLLEGE_HALLS) as CuhkCollege[];
export const CITYU_COMPOUND_NAMES = Object.keys(
  CITYU_COMPOUNDS,
) as CityUCompound[];

/** Residence groups for a campus (CUHK colleges or CityU compounds). */
export function getResidenceGroups(campus: CampusId): readonly string[] {
  return campus === "cityu" ? CITYU_COMPOUND_NAMES : CUHK_COLLEGES;
}

export function getHallsForResidence(
  campus: CampusId,
  residence: string,
): readonly string[] {
  if (campus === "cityu") {
    if (residence in CITYU_COMPOUNDS) {
      return CITYU_COMPOUNDS[residence as CityUCompound];
    }
    return [];
  }
  const college = migrateCuhkCollegeLabel(residence);
  if (college in CUHK_COLLEGE_HALLS) {
    return CUHK_COLLEGE_HALLS[college as CuhkCollege];
  }
  return [];
}

export function getHallsForCollege(college: CuhkCollege | string): readonly string[] {
  const migrated = migrateCuhkCollegeLabel(college);
  if (migrated in CUHK_COLLEGE_HALLS) {
    return CUHK_COLLEGE_HALLS[migrated as CuhkCollege];
  }
  return [];
}

export function getHallsForCompound(
  compound: CityUCompound | string,
): readonly string[] {
  if (compound in CITYU_COMPOUNDS) {
    return CITYU_COMPOUNDS[compound as CityUCompound];
  }
  return [];
}

/** Label for the first delivery dropdown (college vs compound). */
export function residenceGroupLabel(campus: CampusId): string {
  return campus === "cityu" ? "Compound" : "College";
}

/** Runner delivers to the hall lobby (or face-to-face meeting spot). */
export function getLobbyForHall(hall: string, campus: CampusId = "cuhk"): string {
  if (!hall) return "";
  if (campus === "cityu") return `${hall} Lobby`;
  const spot = findCuhkDeliveryLocation(hall);
  if (spot?.faceToFaceAvailable) return `${spot.name} (meet here)`;
  if (hall === "Learning Garden" || hall === "University Library") {
    return `${hall} entrance`;
  }
  return `${hall} lobby`;
}

export function formatDeliveryAddress(
  college: string,
  hall: string,
): string {
  return [college, hall].filter(Boolean).join(" → ");
}

