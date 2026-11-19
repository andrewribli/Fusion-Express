import { setDrinkOptionGroup } from "@fusion-express/shared/canteen-set-options";
import type { SimpleMenuItem } from "./simple-menu";

const img = "https://placehold.co/200x200/png";

/**
 * Generic "Rice with Dishes" options for college canteens.
 * Prices are placeholders — customize per venue later.
 */
export const RICE_WITH_DISHES_ITEMS: SimpleMenuItem[] = [
  {
    id: "rice-1-dish",
    name: "1 Dish + Rice (單餸飯)",
    description:
      "Rice with 1 dish — choose at the counter. Set drink: hot free · iced +$3.",
    price: 28,
    category: "mains",
    image: img,
    mealPeriods: ["lunch", "dinner"],
    includesDrink: true,
    optionGroups: [setDrinkOptionGroup()],
  },
  {
    id: "rice-2-dishes",
    name: "2 Dishes + Rice (兩餸飯)",
    description:
      "Rice with 2 dishes — choose at the counter. Set drink: hot free · iced +$3.",
    price: 33,
    category: "mains",
    image: img,
    mealPeriods: ["lunch", "dinner"],
    includesDrink: true,
    optionGroups: [setDrinkOptionGroup()],
  },
  {
    id: "rice-3-dishes",
    name: "3 Dishes + Rice (三餸飯)",
    description:
      "Rice with 3 dishes — choose at the counter. Set drink: hot free · iced +$3.",
    price: 40,
    category: "mains",
    image: img,
    mealPeriods: ["lunch", "dinner"],
    includesDrink: true,
    optionGroups: [setDrinkOptionGroup()],
  },
];

export function withRiceWithDishes(items: SimpleMenuItem[]): SimpleMenuItem[] {
  if (items.some((item) => item.id === "rice-1-dish")) return items;
  return [...RICE_WITH_DISHES_ITEMS, ...items];
}
