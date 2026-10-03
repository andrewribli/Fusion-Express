/**
 * Canonical CUHK delivery stops for Fusion + canteen checkout.
 * College keys are stable ids; display labels live in COLLEGE_LABELS.
 */

export type CuhkDeliveryCollegeId =
  | "chung-chi"
  | "new-asia"
  | "united"
  | "shaw"
  | "morningside"
  | "shho"
  | "cw-chu"
  | "wys"
  | "lws"
  | "pg"
  | "other"
  | "ulib";

export type CuhkDeliveryLocation = {
  id: string;
  name: string;
  campus: "cuhk";
  college: CuhkDeliveryCollegeId;
  /** Meet at the spot instead of a dorm lobby. */
  faceToFaceAvailable: boolean;
};

function loc(
  id: string,
  name: string,
  college: CuhkDeliveryCollegeId,
  faceToFaceAvailable = false,
): CuhkDeliveryLocation {
  return { id, name, campus: "cuhk", college, faceToFaceAvailable };
}

/** Display name for the college / group dropdown. */
export const CUHK_COLLEGE_LABELS: Record<CuhkDeliveryCollegeId, string> = {
  "chung-chi": "Chung Chi College",
  "new-asia": "New Asia College",
  united: "United College",
  shaw: "Shaw College",
  morningside: "Morningside College",
  shho: "S.H. Ho College (SHHO)",
  "cw-chu": "C.W. Chu College",
  wys: "Wu Yee Sun College (WYS)",
  lws: "Lee Woo Sing College (LWS)",
  pg: "Postgraduate Halls (PGH)",
  other: "International House",
  ulib: "Campus Facilities",
};

export const CUHK_DELIVERY_LOCATIONS: readonly CuhkDeliveryLocation[] = [
  // ── Chung Chi College ──
  loc("cc-hua-lien-tang", "Hua Lien Tang", "chung-chi"),
  loc("cc-lee-shu-pui", "Lee Shu Pui Hall", "chung-chi"),
  loc("cc-madam-sh-ho", "Madam S.H. Ho Hall", "chung-chi"),
  loc("cc-ming-hua-tang", "Ming Hua Tang", "chung-chi"),
  loc("cc-pmhc-high", "PMHC High Block", "chung-chi"),
  loc("cc-pmhc-low", "PMHC Low Block", "chung-chi"),
  loc("cc-theology", "Theology Building", "chung-chi"),
  loc("cc-wen-chih-tang", "Wen Chih Tang", "chung-chi"),
  loc("cc-wen-lin-tang", "Wen Lin Tang", "chung-chi"),
  loc("cc-ying-lin-tang", "Ying Lin Tang", "chung-chi"),

  // ── New Asia College ──
  loc("na-zhi-xing", "Zhi Xing Building", "new-asia"),
  loc("na-xue-si", "Xue Si Building", "new-asia"),
  loc("na-zhi-wen", "Zhi Wen Building", "new-asia"),
  loc("na-zi-xia", "Zi Xia Building", "new-asia"),
  loc("na-mei-yun-tang", "Mei Yun Tang", "new-asia"),

  // ── United College ──
  loc("uc-adam-schall", "Adam Schall Residence", "united"),
  loc("uc-bethlehem", "Bethlehem Hall", "united"),
  loc("uc-hang-seng", "Hang Seng Hall", "united"),
  loc("uc-chan-chun-ha", "Chan Chun Ha Hostel", "united"),
  loc("uc-choi-kai-yau", "Choi Kai Yau Residence", "united"),

  // ── Shaw College ──
  loc("shaw-block-a", "Shaw College Hostel A", "shaw"),
  loc("shaw-block-b", "Shaw College Hostel B", "shaw"),
  loc("shaw-block-c", "Shaw College Hostel C", "shaw"),
  loc("shaw-block-d", "Shaw College Hostel D", "shaw"),

  // ── Morningside College ──
  loc("mc-block-a", "Morningside Hostel A", "morningside"),
  loc("mc-block-b", "Morningside Hostel B", "morningside"),

  // ── S.H. Ho College ──
  loc("shho-ho-tim", "Ho Tim Hall", "shho"),
  loc("shho-lee-quo-wei", "Lee Quo Wei Hall", "shho"),

  // ── C.W. Chu College ──
  loc("cwchu-hostel", "C.W. Chu College Hostel", "cw-chu"),

  // ── Wu Yee Sun College ──
  loc("wys-hostel", "Wu Yee Sun Hostel", "wys"),

  // ── Lee Woo Sing College ──
  loc("lws-hostel", "Lee Woo Sing Hostel", "lws"),

  // ── Postgraduate ──
  loc("pg-hall-1", "Postgraduate Hall 1", "pg"),
  loc("pg-hall-2", "Postgraduate Hall 2", "pg"),
  loc("pg-hall-3", "Postgraduate Hall 3", "pg"),
  loc("pg-hall-4", "Postgraduate Hall 4", "pg"),
  loc("pg-hall-5", "Postgraduate Hall 5", "pg"),
  loc("pg-hall-6", "Postgraduate Hall 6", "pg"),

  // ── Standalone ──
  loc("i-house", "International House", "other"),

  // ── Study / public spaces (face-to-face) ──
  loc("learning-garden", "Learning Garden", "ulib", true),
];

const COLLEGE_ORDER: readonly CuhkDeliveryCollegeId[] = [
  "chung-chi",
  "new-asia",
  "united",
  "shaw",
  "morningside",
  "shho",
  "cw-chu",
  "wys",
  "lws",
  "pg",
  "other",
  "ulib",
];

/** College label → hall display names (for the existing two-step picker). */
export function buildCuhkCollegeHalls(): Record<string, readonly string[]> {
  const out: Record<string, string[]> = {};
  for (const collegeId of COLLEGE_ORDER) {
    const label = CUHK_COLLEGE_LABELS[collegeId];
    out[label] = CUHK_DELIVERY_LOCATIONS.filter((row) => row.college === collegeId).map(
      (row) => row.name,
    );
  }
  return out;
}

export function findCuhkDeliveryLocation(
  hallNameOrId: string | null | undefined,
): CuhkDeliveryLocation | undefined {
  const raw = hallNameOrId?.trim();
  if (!raw) return undefined;
  const needle = raw.toLowerCase();
  return CUHK_DELIVERY_LOCATIONS.find(
    (row) => row.id === needle || row.name.toLowerCase() === needle,
  );
}
