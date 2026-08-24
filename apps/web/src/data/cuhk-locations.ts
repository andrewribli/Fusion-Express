export const CUHK_COLLEGE_HALLS = {
  "Shaw College": ["Sun Chui", "Sun Tak", "Sun Hing", "Sun King"],
  "United College": ["Adam Schall", "William M.W. Mong", "Wu Chung", "Y.C. Liang"],
  "Chung Chi College": ["Ming Hua", "Ying Lin", "Wen Lin", "Siu Kwan"],
  "New Asia College": ["Ch'ien Mu", "Henry Chan", "Tang Chun", "Fang Cheng"],
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
  roomNumber?: string,
): string {
  const parts = [college, hall];
  if (roomNumber?.trim()) {
    parts.push(`Room ${roomNumber.trim()}`);
  }
  return parts.join(" → ");
}
