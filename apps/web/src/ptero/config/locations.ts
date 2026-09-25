/**
 * CityU student residence. Halls 1–12 sit in two compounds.
 * Kowloon Tong is next to Festival Walk (Taste). Ma On Shan is farther.
 *
 * When campuses merge, swap this module per `campus` id the same way
 * CUHK colleges/halls hang off `campus: "cuhk"`.
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

export type CityUCompound = keyof typeof CITYU_COMPOUNDS;

export const CITYU_COMPOUND_NAMES = Object.keys(
  CITYU_COMPOUNDS,
) as CityUCompound[];

export function getHallsForCompound(
  compound: CityUCompound | string,
): readonly string[] {
  if (compound in CITYU_COMPOUNDS) {
    return CITYU_COMPOUNDS[compound as CityUCompound];
  }
  return [];
}

/** Runner delivers to the hall lobby */
export function getLobbyForHall(hall: string): string {
  return hall ? `${hall} Lobby` : "";
}

export function formatDeliveryAddress(compound: string, hall: string): string {
  return [compound, hall].filter(Boolean).join(" → ");
}
