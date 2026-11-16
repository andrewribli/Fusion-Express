import type { SimpleMenuItem } from "@/data/canteen/simple-menu";

const img = "https://placehold.co/200x200/png";

/**
 * Generic "Rice with Dishes" options for college canteens.
 * Prices are placeholders — customize per venue later.
 */
export const RICE_WITH_DISHES_ITEMS: SimpleMenuItem[] = [
  {
    id: "rice-1-dish",
    name: "1 Dish + Rice (單餸飯)",
    description: "Rice with 1 dish — choose at the counter. Price placeholder.",
    price: 28,
    category: "mains",
    image: img,
  },
  {
    id: "rice-2-dishes",
    name: "2 Dishes + Rice (兩餸飯)",
    description: "Rice with 2 dishes — choose at the counter. Price placeholder.",
    price: 33,
    category: "mains",
    image: img,
  },
  {
    id: "rice-3-dishes",
    name: "3 Dishes + Rice (三餸飯)",
    description: "Rice with 3 dishes — choose at the counter. Price placeholder.",
    price: 40,
    category: "mains",
    image: img,
  },
];

export function withRiceWithDishes(items: SimpleMenuItem[]): SimpleMenuItem[] {
  if (items.some((item) => item.id === "rice-1-dish")) return items;
  return [...RICE_WITH_DISHES_ITEMS, ...items];
}
