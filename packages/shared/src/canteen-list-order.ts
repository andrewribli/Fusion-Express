/** Featured canteens pinned at the top of the default venue list. */
export const CANTEEN_LIST_PIN_ORDER = [
  "cc-canteen",
  "ebenezers",
  "cafe-tolo",
  "cu-cafe",
  "paper-and-coffee",
  "sorazen",
] as const;

export type CanteenListPinId = (typeof CANTEEN_LIST_PIN_ORDER)[number];

/** Sort venues: pinned ids first (in pin order), then the rest in original order. */
export function pinCanteenListOrder<T extends { id: string }>(venues: T[]): T[] {
  const pinRank = new Map<string, number>(
    CANTEEN_LIST_PIN_ORDER.map((id, i) => [id, i]),
  );
  return [...venues].sort((a, b) => {
    const pa = pinRank.has(a.id) ? pinRank.get(a.id)! : 1000;
    const pb = pinRank.has(b.id) ? pinRank.get(b.id)! : 1000;
    if (pa !== pb) return pa - pb;
    return 0;
  });
}
