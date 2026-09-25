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

/** Maps delivery-address / runner-profile college strings → CollegeId. */
const COLLEGE_ALIASES: Record<string, CollegeId> = {
  UC: "UC",
  "UNITED COLLEGE": "UC",
  NA: "NA",
  "NEW ASIA": "NA",
  "NEW ASIA COLLEGE": "NA",
  CC: "CC",
  "CHUNG CHI": "CC",
  "CHUNG CHI COLLEGE": "CC",
  SHAW: "Shaw",
  "SHAW COLLEGE": "Shaw",
  MORNINGSIDE: "Morningside",
  "MORNINGSIDE COLLEGE": "Morningside",
  SHHO: "SHHO",
  "S.H. HO": "SHHO",
  "S.H. HO COLLEGE": "SHHO",
  "S.H. HO COLLEGE (SHHO)": "SHHO",
  CWCHU: "CWChu",
  "C.W. CHU": "CWChu",
  "C.W. CHU COLLEGE": "CWChu",
  WYS: "WYS",
  "WU YEE SUN": "WYS",
  "WU YEE SUN COLLEGE": "WYS",
  "WU YEE SUN COLLEGE (WYS)": "WYS",
  LWS: "LWS",
  "LEE WOO SING": "LWS",
  "LEE WOO SING COLLEGE": "LWS",
  "LEE WOO SING COLLEGE (LWS)": "LWS",
};

const RESTAURANT_COLLEGE: Record<string, CollegeId | null> = {
  "benjamin-franklin": null,
  "uc-canteen": "UC",
  "cu-cafe": null,
  "sh-ho-canteen": "SHHO",
  "paper-and-coffee": null,
  sorazen: null,
  ebeneezers: null,
  "orchid-lodge": "CC",
  "na-canteen": "NA",
  "cc-canteen": "CC",
  "shaw-canteen": "Shaw",
  wys: "WYS",
  lws: "LWS",
  "chung-chi-tang": "CC",
};

const RESTAURANT_NAMES: Record<string, string> = {
  "benjamin-franklin": "Benjamin Franklin Canteen",
  "uc-canteen": "UC Canteen",
  "cu-cafe": "CU Cafe",
  "sh-ho-canteen": "S.H. Ho College Canteen",
  "paper-and-coffee": "Paper & Coffee",
  sorazen: "SoraZen",
  ebeneezers: "Ebeneezer's",
  "orchid-lodge": "Orchid Lodge",
  "na-canteen": "NA Canteen",
  "cc-canteen": "CC Canteen",
  "shaw-canteen": "Shaw Canteen",
  wys: "WYS Canteen",
  lws: "LWS Canteen",
  "chung-chi-tang": "Chung Chi Tang",
};

export function getCollege(id: CollegeId | string | null | undefined): College | undefined {
  if (!id) return undefined;
  return COLLEGES.find((c) => c.id === id);
}

export function collegeLabel(id: CollegeId | string | null | undefined): string {
  const c = getCollege(id);
  return c ? `${c.shortName} (${c.fullName})` : id ?? "";
}

export function normalizeCollegeId(
  value: string | null | undefined,
): CollegeId | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const byId = COLLEGES.find((c) => c.id === trimmed);
  if (byId) return byId.id;
  const key = trimmed.replace(/\s+/g, " ").toUpperCase();
  return COLLEGE_ALIASES[key] ?? null;
}

/** Parse `canteen:{restaurantId}:{itemId}` → restaurant slug. */
export function restaurantIdFromCanteenItemId(itemId: string): string | null {
  if (!itemId.startsWith("canteen:")) return null;
  const rest = itemId.slice("canteen:".length);
  const slash = rest.indexOf(":");
  if (slash <= 0) return null;
  return rest.slice(0, slash);
}

export function canteenCollegeForRestaurant(
  restaurantId: string | null | undefined,
): CollegeId | null {
  if (!restaurantId) return null;
  return RESTAURANT_COLLEGE[restaurantId] ?? null;
}

export function canteenNameForRestaurant(
  restaurantId: string | null | undefined,
): string {
  if (!restaurantId) return "the canteen";
  return RESTAURANT_NAMES[restaurantId] ?? restaurantId;
}

export function restaurantIdFromOrderItems(
  items: { itemId: string }[],
): string | null {
  for (const item of items) {
    const id = restaurantIdFromCanteenItemId(item.itemId);
    if (id) return id;
  }
  return null;
}

/** 10% off canteen food when runner college matches canteen college. */
export const COLLEGE_CANTEEN_DISCOUNT_RATE = 0.1;

export function computeCollegeDiscount(
  foodSubtotal: number,
  runnerCollege: string | null | undefined,
  canteenCollege: string | null | undefined,
): { discountApplied: boolean; discountAmount: number } {
  const runner = normalizeCollegeId(runnerCollege);
  const canteen = normalizeCollegeId(canteenCollege);
  if (!runner || !canteen || runner !== canteen) {
    return { discountApplied: false, discountAmount: 0 };
  }
  const food = Math.max(0, Number(foodSubtotal) || 0);
  const discountAmount =
    Math.round(food * COLLEGE_CANTEEN_DISCOUNT_RATE * 100) / 100;
  return { discountApplied: discountAmount > 0, discountAmount };
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}
