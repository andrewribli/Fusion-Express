/**
 * CityU residence affiliations for runner ↔ canteen discount matching.
 * Mirrors CUHK `CollegeId` shape so campuses can merge later.
 *
 * CityU maps "college" to student residence compounds (not CUHK colleges).
 */
export type CollegeId = "KLNT" | "MOS";

export type College = {
  id: CollegeId;
  shortName: string;
  fullName: string;
  /** CityU compound name used in delivery address / runner profile. */
  compound: string;
};

export const COLLEGES: College[] = [
  {
    id: "KLNT",
    shortName: "KLNT",
    fullName: "Kowloon Tong Student Residence",
    compound: "Kowloon Tong Compound",
  },
  {
    id: "MOS",
    shortName: "MOS",
    fullName: "Ma On Shan Student Residence",
    compound: "Ma On Shan Compound",
  },
];

export function getCollege(id: CollegeId | string | null | undefined): College | undefined {
  if (!id) return undefined;
  return COLLEGES.find((c) => c.id === id);
}

export function collegeLabel(id: CollegeId | string | null | undefined): string {
  const c = getCollege(id);
  return c ? `${c.shortName} (${c.fullName})` : id ?? "";
}

/** Map delivery compound → college id for discount matching. */
export function collegeIdForCompound(
  compound: string | null | undefined,
): CollegeId | null {
  if (!compound) return null;
  const match = COLLEGES.find((c) => c.compound === compound);
  return match?.id ?? null;
}

/** 10% off canteen food when runner college matches canteen college. */
export const COLLEGE_CANTEEN_DISCOUNT_RATE = 0.1;

export function computeCollegeDiscount(
  foodSubtotal: number,
  runnerCollege: string | null | undefined,
  canteenCollege: string | null | undefined,
): { discountApplied: boolean; discountAmount: number } {
  if (!runnerCollege || !canteenCollege) {
    return { discountApplied: false, discountAmount: 0 };
  }
  if (runnerCollege !== canteenCollege) {
    return { discountApplied: false, discountAmount: 0 };
  }
  const discountAmount =
    Math.round(foodSubtotal * COLLEGE_CANTEEN_DISCOUNT_RATE * 100) / 100;
  return { discountApplied: discountAmount > 0, discountAmount };
}
