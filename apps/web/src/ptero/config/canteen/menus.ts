import type { RestaurantId } from "@/ptero/config/canteen/restaurants";

/** Meal periods — same labels as CUHK UC canteen for merge compatibility. */
export type MealPeriod = "breakfast" | "lunch" | "tea" | "dinner";

export const PLACEHOLDER_IMAGE = "https://via.placeholder.com/200";

export type CanteenMenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl: string;
  timeZones: MealPeriod[];
};

export const MEAL_PERIODS: Record<
  MealPeriod,
  { label: string; order: number }
> = {
  breakfast: { label: "Breakfast", order: 0 },
  lunch: { label: "Lunch", order: 1 },
  tea: { label: "Tea Time", order: 2 },
  dinner: { label: "Dinner", order: 3 },
};

const B: MealPeriod[] = ["breakfast"];
const L: MealPeriod[] = ["lunch"];
const T: MealPeriod[] = ["tea"];
const D: MealPeriod[] = ["dinner"];
const LD: MealPeriod[] = ["lunch", "dinner"];
const ALL: MealPeriod[] = ["breakfast", "lunch", "tea", "dinner"];
const LTD: MealPeriod[] = ["lunch", "tea", "dinner"];

function item(
  partial: Omit<CanteenMenuItem, "imageUrl"> & { imageUrl?: string },
): CanteenMenuItem {
  return { imageUrl: PLACEHOLDER_IMAGE, ...partial };
}

/** Dummy menus per CityU canteen — replace with real menus later. */
const MENUS: Record<RestaurantId, CanteenMenuItem[]> = {
  "city-express-ac1": [
    item({
      id: "ce-chicken-rice",
      name: "Chicken Rice",
      description: "Steamed chicken with fragrant rice.",
      price: 38,
      category: "Mains",
      timeZones: LD,
    }),
    item({
      id: "ce-fish-burger",
      name: "Fried Fish Burger",
      description: "Crispy fish fillet, lettuce, tartar sauce.",
      price: 42,
      category: "Mains",
      timeZones: LTD,
    }),
    item({
      id: "ce-milk-tea",
      name: "Milk Tea",
      description: "Hong Kong–style milk tea.",
      price: 18,
      category: "Drinks",
      timeZones: ALL,
    }),
    item({
      id: "ce-toast",
      name: "Butter Toast Set",
      description: "Toast with butter and soft-boiled egg.",
      price: 28,
      category: "Breakfast",
      timeZones: B,
    }),
    item({
      id: "ce-fries",
      name: "French Fries",
      price: 22,
      category: "Sides",
      timeZones: LTD,
    }),
    item({
      id: "ce-lemon-tea",
      name: "Iced Lemon Tea",
      price: 16,
      category: "Drinks",
      timeZones: ALL,
    }),
  ],
  "ac2-canteen": [
    item({
      id: "ac2-congee",
      name: "Century Egg Congee",
      price: 26,
      category: "Breakfast",
      timeZones: B,
    }),
    item({
      id: "ac2-chicken-rice",
      name: "Chicken Rice",
      price: 36,
      category: "Mains",
      timeZones: LD,
    }),
    item({
      id: "ac2-fish-burger",
      name: "Fried Fish Burger",
      price: 40,
      category: "Mains",
      timeZones: L,
    }),
    item({
      id: "ac2-lemon-tea",
      name: "Iced Lemon Tea",
      price: 16,
      category: "Drinks",
      timeZones: ALL,
    }),
    item({
      id: "ac2-toast-set",
      name: "Ham & Egg Toast",
      price: 30,
      category: "Tea Time",
      timeZones: T,
    }),
    item({
      id: "ac2-spaghetti",
      name: "Tomato Meat Sauce Spaghetti",
      price: 44,
      category: "Mains",
      timeZones: D,
    }),
    item({
      id: "ac2-milk-tea",
      name: "Milk Tea",
      price: 16,
      category: "Drinks",
      timeZones: ALL,
    }),
  ],
  "ac3-cafe": [
    item({
      id: "ac3-eggs-benedict",
      name: "Eggs Benedict",
      price: 48,
      category: "Breakfast",
      timeZones: B,
    }),
    item({
      id: "ac3-fish-burger",
      name: "Fried Fish Burger",
      description: "Western-style with fries.",
      price: 55,
      category: "Mains",
      timeZones: LD,
    }),
    item({
      id: "ac3-caesar",
      name: "Chicken Caesar Salad",
      price: 46,
      category: "Mains",
      timeZones: LTD,
    }),
    item({
      id: "ac3-latte",
      name: "Café Latte",
      price: 28,
      category: "Drinks",
      timeZones: ALL,
    }),
    item({
      id: "ac3-milk-tea",
      name: "Milk Tea",
      price: 22,
      category: "Drinks",
      timeZones: ALL,
    }),
    item({
      id: "ac3-croissant",
      name: "Butter Croissant",
      price: 24,
      category: "Bakery",
      timeZones: B,
    }),
  ],
  cmcafe: [
    item({
      id: "cmc-chicken-rice",
      name: "Chicken Rice",
      price: 40,
      category: "Mains",
      timeZones: LD,
    }),
    item({
      id: "cmc-fish-burger",
      name: "Fried Fish Burger",
      price: 45,
      category: "Mains",
      timeZones: LTD,
    }),
    item({
      id: "cmc-milk-tea",
      name: "Milk Tea",
      price: 20,
      category: "Drinks",
      timeZones: ALL,
    }),
    item({
      id: "cmc-americano",
      name: "Americano",
      price: 22,
      category: "Drinks",
      timeZones: ALL,
    }),
    item({
      id: "cmc-club",
      name: "Club Sandwich",
      price: 38,
      category: "Café",
      timeZones: B,
    }),
    item({
      id: "cmc-brownie",
      name: "Chocolate Brownie",
      price: 26,
      category: "Dessert",
      timeZones: T,
    }),
  ],
  "hall-canteen-klnt": [
    item({
      id: "klnt-chicken-rice",
      name: "Chicken Rice",
      price: 35,
      category: "Mains",
      timeZones: LD,
    }),
    item({
      id: "klnt-fish-burger",
      name: "Fried Fish Burger",
      price: 38,
      category: "Mains",
      timeZones: LTD,
    }),
    item({
      id: "klnt-sandwich",
      name: "Club Sandwich",
      price: 32,
      category: "Café",
      timeZones: B,
    }),
    item({
      id: "klnt-milk-tea",
      name: "Milk Tea",
      price: 16,
      category: "Drinks",
      timeZones: ALL,
    }),
    item({
      id: "klnt-ramen",
      name: "Instant Ramen Set",
      price: 28,
      category: "Mains",
      timeZones: T,
    }),
    item({
      id: "klnt-fries",
      name: "French Fries",
      price: 20,
      category: "Sides",
      timeZones: LTD,
    }),
  ],
  "hall-canteen-mos": [
    item({
      id: "mos-chicken-rice",
      name: "Chicken Rice",
      price: 35,
      category: "Mains",
      timeZones: LD,
    }),
    item({
      id: "mos-fish-burger",
      name: "Fried Fish Burger",
      price: 38,
      category: "Mains",
      timeZones: L,
    }),
    item({
      id: "mos-milk-tea",
      name: "Milk Tea",
      price: 16,
      category: "Drinks",
      timeZones: ALL,
    }),
    item({
      id: "mos-pasta",
      name: "Creamy Pasta",
      price: 42,
      category: "Mains",
      timeZones: D,
    }),
    item({
      id: "mos-muffin",
      name: "Blueberry Muffin",
      price: 18,
      category: "Café",
      timeZones: B,
    }),
    item({
      id: "mos-lemon-tea",
      name: "Iced Lemon Tea",
      price: 15,
      category: "Drinks",
      timeZones: ALL,
    }),
  ],
};

export function getCanteenMenu(restaurantId: RestaurantId | string): CanteenMenuItem[] {
  return MENUS[restaurantId as RestaurantId] ?? [];
}

export function getCanteenMenuItem(
  restaurantId: string,
  itemId: string,
): CanteenMenuItem | undefined {
  return getCanteenMenu(restaurantId).find((i) => i.id === itemId);
}

export function groupMenuByMealPeriod(
  items: CanteenMenuItem[],
): { period: MealPeriod; label: string; items: CanteenMenuItem[] }[] {
  const periods = (Object.keys(MEAL_PERIODS) as MealPeriod[]).sort(
    (a, b) => MEAL_PERIODS[a].order - MEAL_PERIODS[b].order,
  );
  return periods
    .map((period) => ({
      period,
      label: MEAL_PERIODS[period].label,
      items: items.filter((i) => i.timeZones.includes(period)),
    }))
    .filter((g) => g.items.length > 0);
}

export function groupMenuByCategory(
  items: CanteenMenuItem[],
): { category: string; items: CanteenMenuItem[] }[] {
  const map = new Map<string, CanteenMenuItem[]>();
  for (const menuItem of items) {
    const list = map.get(menuItem.category) ?? [];
    list.push(menuItem);
    map.set(menuItem.category, list);
  }
  return [...map.entries()].map(([category, groupItems]) => ({
    category,
    items: groupItems,
  }));
}
