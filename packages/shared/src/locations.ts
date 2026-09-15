export const CUHK_COLLEGE_HALLS = {
  "Shaw College": ["Kuo Mou Hall", "Student Hostel II"],
  "United College": ["Adam Schall", "William M.W. Mong", "Wu Chung", "Y.C. Liang"],
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
} as const;

export type CuhkCollege = keyof typeof CUHK_COLLEGE_HALLS;

export const CUHK_COLLEGES = Object.keys(CUHK_COLLEGE_HALLS) as CuhkCollege[];

export function getHallsForCollege(college: CuhkCollege): readonly string[] {
  return CUHK_COLLEGE_HALLS[college];
}

/** Runner delivers to the hall lobby */
export function getLobbyForHall(hall: string): string {
  return `${hall} lobby`;
}

export function formatDeliveryAddress(
  college: string,
  hall: string,
): string {
  return [college, hall].filter(Boolean).join(" → ");
}
