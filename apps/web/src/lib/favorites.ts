/** Max favorites stored on the user document. */
export const MAX_FAVORITES = 100;

const LOCAL_KEY = "fusion_favorites";

export function readLocalFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      .map((id) => id.trim())
      .slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

export function clearLocalFavoriteIds(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* ignore */
  }
}

export function normalizeFavoriteIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of value) {
    if (typeof row !== "string") continue;
    const id = row.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_FAVORITES) break;
  }
  return out;
}

/** Stable favorite key for a canteen dish. */
export function canteenFavoriteId(restaurantId: string, itemId: string): string {
  return `canteen:${restaurantId}:${itemId}`;
}

/**
 * Keep favorited items first, then apply an optional secondary sort
 * to the rest. Favorites keep the secondary sort among themselves.
 */
export function sortFavoritesFirst<T>(
  items: T[],
  getId: (item: T) => string,
  favoriteIds: ReadonlySet<string> | readonly string[],
  secondary?: (a: T, b: T) => number,
): T[] {
  const fav =
    favoriteIds instanceof Set
      ? favoriteIds
      : new Set(favoriteIds);
  const copy = [...items];
  copy.sort((a, b) => {
    const aFav = fav.has(getId(a)) ? 0 : 1;
    const bFav = fav.has(getId(b)) ? 0 : 1;
    if (aFav !== bFav) return aFav - bFav;
    return secondary ? secondary(a, b) : 0;
  });
  return copy;
}

export function filterFavoritesOnly<T>(
  items: T[],
  getId: (item: T) => string,
  favoriteIds: ReadonlySet<string> | readonly string[],
): T[] {
  const fav =
    favoriteIds instanceof Set
      ? favoriteIds
      : new Set(favoriteIds);
  return items.filter((item) => fav.has(getId(item)));
}
