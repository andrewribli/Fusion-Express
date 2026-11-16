import type { MenuCategory } from "./bf-menu";

const local = (file: string) => `/canteen/food/${file}`;

/** Local food photos by menu category (downloaded stand-ins). */
const POOLS: Record<MenuCategory, string[]> = {
  mains: [
    local("salad.jpg"),
    local("grill.jpg"),
    local("wrap.jpg"),
    local("burger.jpg"),
    local("pizza.jpg"),
    local("noodles.jpg"),
    local("friedrice.jpg"),
    local("kebab.jpg"),
    local("avocado.jpg"),
    local("waffle.jpg"),
    local("omelette.jpg"),
    local("fish.jpg"),
  ],
  snacks: [
    local("dimsum.jpg"),
    local("wings.jpg"),
    local("fries.jpg"),
    local("bread.jpg"),
    local("pancake.jpg"),
    local("omelette.jpg"),
    local("pizza.jpg"),
    local("fish.jpg"),
  ],
  drinks: [
    local("coffee.jpg"),
    local("latte.jpg"),
    local("tea.jpg"),
    local("boba.jpg"),
    local("milkshake.jpg"),
    local("juice.jpg"),
  ],
  dessert: [
    local("cake.jpg"),
    local("icecream.jpg"),
    local("dessert.jpg"),
    local("cheesecake.jpg"),
    local("lava.jpg"),
    local("cookies.jpg"),
    local("waffle.jpg"),
    local("soup.jpg"),
  ],
};

/** Named hero shots for signature / requested dishes. */
export const FOOD_HERO: Record<string, string> = {
  "healthy-breakfast-combo": local("salad.jpg"),
  "chicken-tikka-kebab": local("kebab.jpg"),
  "taiwanese-cheesy-omelette": local("omelette.jpg"),
  "taiwan-egg-pancake": local("omelette.jpg"),
  "taiwanese-pancake": local("omelette.jpg"),
  "cheese-chicken-burrito": local("wrap.jpg"),
  "all-day-breakfast-waffle": local("waffle.jpg"),
  "all-day-breakfast-croissant": local("avocado.jpg"),
  "baileys-lava-cake": local("lava.jpg"),
  "fun-hot-dog": local("burger.jpg"),
  "sweet-soup": local("soup.jpg"),
};

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function isPlaceholderImage(url: string | undefined | null): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes("placehold") ||
    lower.includes("via.placeholder") ||
    lower.includes("images.unsplash.com") ||
    lower.trim() === ""
  );
}

/** Deterministic local food photo from item id + category. */
export function canteenFoodImage(
  id: string,
  category: MenuCategory,
): string {
  if (FOOD_HERO[id]) return FOOD_HERO[id];
  const pool = POOLS[category] ?? POOLS.mains;
  return pool[hashId(id) % pool.length] ?? pool[0];
}

export function withFoodImages<
  T extends { id: string; category: MenuCategory; image: string },
>(items: T[]): T[] {
  return items.map((item) =>
    isPlaceholderImage(item.image)
      ? { ...item, image: canteenFoodImage(item.id, item.category) }
      : item,
  );
}
