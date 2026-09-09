import type { MenuItem } from "@/lib/types";

export const POPULAR_PER_CATEGORY = 50;
export const MEAT_POPULAR_CAP = 100;

export function popularCapForAisle(aisleId: string): number {
  return aisleId === "meat" ? MEAT_POPULAR_CAP : POPULAR_PER_CATEGORY;
}

const POPULAR_BRANDS =
  /\b(nissin|demae|shin|indomie|meiji|nestle|vitasoy|kowloon|calbee|oreo|kitkat|coca|coke|sprite|pocari|chobani|doll|wanchai|bibigo|barilla|pampers|whisper|skippy|lurpak|trappist|dutch lady|pauls)\b/i;

export function popularityScore(item: MenuItem): number {
  let score = Math.max(0, 8000 - item.sortOrder);
  if (item.image) score += 2500;
  if (POPULAR_BRANDS.test(item.name)) score += 600;
  return score;
}

export function topPopularItems(
  items: MenuItem[],
  cap = POPULAR_PER_CATEGORY,
): MenuItem[] {
  return [...items]
    .sort(
      (a, b) =>
        popularityScore(b) - popularityScore(a) || a.name.localeCompare(b.name),
    )
    .slice(0, cap);
}
