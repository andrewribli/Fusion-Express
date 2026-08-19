const FAVORITES_KEY = "fusion_favorites";

export function getFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(itemId: string): boolean {
  const ids = getFavoriteIds();
  const exists = ids.includes(itemId);
  const next = exists ? ids.filter((id) => id !== itemId) : [...ids, itemId];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return !exists;
}

export function isFavorite(itemId: string): boolean {
  return getFavoriteIds().includes(itemId);
}
