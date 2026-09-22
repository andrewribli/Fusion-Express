/** CUHK college codes for runner ↔ canteen discount matching. */
export type CollegeId =
  | "UC"
  | "NA"
  | "CC"
  | "Shaw"
  | "Morningside"
  | "SHHO"
  | "CWChu"
  | "WYS"
  | "LWS";

export type College = {
  id: CollegeId;
  shortName: string;
  fullName: string;
};

export const COLLEGES: College[] = [
  { id: "UC", shortName: "UC", fullName: "United College" },
  { id: "NA", shortName: "NA", fullName: "New Asia College" },
  { id: "CC", shortName: "CC", fullName: "Chung Chi College" },
  { id: "Shaw", shortName: "Shaw", fullName: "Shaw College" },
  { id: "Morningside", shortName: "Morningside", fullName: "Morningside College" },
  { id: "SHHO", shortName: "S.H. Ho", fullName: "S.H. Ho College" },
  { id: "CWChu", shortName: "C.W. Chu", fullName: "C.W. Chu College" },
  { id: "WYS", shortName: "WYS", fullName: "Wu Yee Sun College" },
  { id: "LWS", shortName: "LWS", fullName: "Lee Woo Sing College" },
];

export function getCollege(id: CollegeId | string | null | undefined): College | undefined {
  if (!id) return undefined;
  return COLLEGES.find((c) => c.id === id);
}

export function collegeLabel(id: CollegeId | string | null | undefined): string {
  const c = getCollege(id);
  return c ? `${c.shortName} (${c.fullName})` : id ?? "";
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
