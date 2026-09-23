import type { CampusId } from "./campus";

export const CUHK_COLLEGE_HALLS = {
  "Shaw College": ["Kuo Mou Hall", "Student Hostel II"],
  "United College": [
    "Adam Schall",
    "Bethlehem Hall",
    "William M.W. Mong",
    "Wu Chung",
    "Y.C. Liang",
  ],
  "Chung Chi College": [
    "Ming Hua",
    "Ying Lin",
    "Wen Lin",
    "Siu Kwan",
    "Madam S.H. Ho Hall",
  ],
  "New Asia College": [
    "Chih Hsing Hall",
    "Xuesi Hall",
    "Grace Tien Hall",
    "Daisy Li Hall",
    "Mei Yun Tan",
  ],
  "S.H. Ho College (SHHO)": ["Ho Tim Hall", "Lee Quo Wei Hall"],
  "Morningside College": ["Hostel 1", "Hostel 2"],
  "C.W. Chu College": [
    "Ina Chan Ho Building",
    "Feng Yu Building",
    "David & Marina Chu Building",
  ],
  "Wu Yee Sun College (WYS)": ["East Block", "West Block"],
  "Lee Woo Sing College (LWS)": [
    "Dorothy and Ti-Hua KOO Building",
    "North Block",
  ],
  "International House (I-House)": [
    "I-House 1",
    "I-House 2",
    "I-House 3",
    "I-House 4",
    "I-House 5",
  ],
  "Postgraduate Halls (PGH)": ["PGH 1", "PGH 2", "PGH 3", "PGH 4"],
  /** Non-hall campus drop-off (central campus, near Fusion / Chung Chi). */
  "Campus Facilities": ["University Library"],
} as const;

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
  ],
  "Ma On Shan Compound": ["Hall 9", "Hall 10", "Hall 11", "Hall 12"],
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
  if (residence in CUHK_COLLEGE_HALLS) {
    return CUHK_COLLEGE_HALLS[residence as CuhkCollege];
  }
  return [];
}

export function getHallsForCollege(college: CuhkCollege | string): readonly string[] {
  if (college in CUHK_COLLEGE_HALLS) {
    return CUHK_COLLEGE_HALLS[college as CuhkCollege];
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

/** Runner delivers to the hall lobby (or library entrance). */
export function getLobbyForHall(hall: string, campus: CampusId = "cuhk"): string {
  if (hall === "University Library") return "University Library entrance";
  if (!hall) return "";
  if (campus === "cityu") return `${hall} Lobby`;
  return `${hall} lobby`;
}

export function formatDeliveryAddress(
  college: string,
  hall: string,
): string {
  return [college, hall].filter(Boolean).join(" → ");
}
