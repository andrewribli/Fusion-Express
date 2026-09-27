import type { CampusId } from "./campus";
import { CUHK_COLLEGE_HALLS } from "./locations";

/**
 * Hall tiers Andrew confirmed for CityU only.
 * Hall 12 (Ma On Shan) is listed so lookup works, with no tier and no surcharge.
 */
export type CityUHallTier = "1-3" | "4-6" | "7-9" | "10-11";

export interface HallMeta {
  id: string;
  name: string;
  campus: CampusId;
  /** CityU only. CUHK halls and Hall 12 have no tier. */
  tier: CityUHallTier | null;
  /** Added to the store base. Null means no confirmed surcharge. */
  surcharge: number | null;
}

function cityuHall(
  n: number,
  tier: CityUHallTier | null,
  surcharge: number | null,
): HallMeta {
  return {
    id: `cityu-${n}`,
    name: `Hall ${n}`,
    campus: "cityu",
    tier,
    surcharge,
  };
}

export const CITYU_HALLS: readonly HallMeta[] = [
  cityuHall(1, "1-3", 1),
  cityuHall(2, "1-3", 1),
  cityuHall(3, "1-3", 1),
  cityuHall(4, "4-6", 0),
  cityuHall(5, "4-6", 0),
  cityuHall(6, "4-6", 0),
  cityuHall(7, "7-9", 2),
  cityuHall(8, "7-9", 2),
  cityuHall(9, "7-9", 2),
  cityuHall(10, "10-11", 3),
  cityuHall(11, "10-11", 3),
  cityuHall(12, null, null),
];

function hallSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** CUHK halls are listed for lookup. They have no tier and no surcharge. */
export const CUHK_HALLS: readonly HallMeta[] = Object.values(
  CUHK_COLLEGE_HALLS,
).flatMap((names) =>
  names.map((name) => ({
    id: `cuhk-${hallSlug(name)}`,
    name,
    campus: "cuhk" as const,
    tier: null,
    surcharge: null,
  })),
);

export const HALLS: readonly HallMeta[] = [...CITYU_HALLS, ...CUHK_HALLS];

function compact(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Match an id, "Hall 7", "7", or a CUHK hall name. Campus filter avoids cross-campus hits. */
export function findHall(
  hallId: string | null | undefined,
  campus?: CampusId,
): HallMeta | undefined {
  const raw = hallId?.trim();
  if (!raw) return undefined;
  const needle = compact(raw);
  const pool = campus ? HALLS.filter((hall) => hall.campus === campus) : HALLS;
  const byId = pool.find((hall) => compact(hall.id) === needle);
  if (byId) return byId;
  const byName = pool.find((hall) => compact(hall.name) === needle);
  if (byName) return byName;
  const number = /^(?:h(?:all)?)?(\d{1,2})$/.exec(needle);
  if (number && (!campus || campus === "cityu")) {
    return CITYU_HALLS.find((hall) => hall.id === `cityu-${number[1]}`);
  }
  return undefined;
}

export function isCityuHall12(hallId: string | null | undefined): boolean {
  return findHall(hallId, "cityu")?.id === "cityu-12";
}
