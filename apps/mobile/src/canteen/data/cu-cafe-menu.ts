import type { SimpleMenuItem } from "./simple-menu";

const img = "https://placehold.co/200x200/png";

/**
 * CU Cafe @ Lee Shau Kee Building (LSK) — from campus kiosk photos (Nov 2026).
 * CUHK members-only catering outlet. Sold-out kiosk rows omitted.
 * Keep in sync with `apps/web/src/data/canteen/cu-cafe-menu.ts`.
 */
export const CU_CAFE_MENU: SimpleMenuItem[] = [
  // ——— Thai Boat Noodle Tea Set (with Coffee / Milk Tea) ———
  {
    id: "boat-noodle-chicken-wing-meatball",
    name: "Boat Noodle with Chicken Wing and Meatball",
    description: "Thai Boat Noodle Tea Set · includes coffee/milk tea",
    price: 36,
    category: "mains",
    image: img,
    includesDrink: true,
    signature: true,
  },
  {
    id: "boat-noodle-pork-chop-meatball",
    name: "Boat Noodle with Pork Chop and Meatball",
    description: "Thai Boat Noodle Tea Set · includes coffee/milk tea",
    price: 36,
    category: "mains",
    image: img,
    includesDrink: true,
  },
  {
    id: "boat-noodle-beef-meatball",
    name: "Boat Noodle with Beef and Meatball",
    description: "Thai Boat Noodle Tea Set · includes coffee/milk tea",
    price: 36,
    category: "mains",
    image: img,
    includesDrink: true,
  },

  // ——— Southeast Asian Noodles Tea Set (with Coffee / Milk Tea) ———
  {
    id: "lemongrass-pork-chop-scallion-oil-lo-mein",
    name: "Lemongrass Pork Chop and Fried Egg with Scallion Oil Lo Mein",
    description: "Southeast Asian Noodles Tea Set · includes coffee/milk tea",
    price: 28,
    category: "mains",
    image: img,
    includesDrink: true,
  },
  {
    id: "vietnamese-lemongrass-pork-chop-noodle-soup",
    name: "Vietnamese Lemongrass Pork Chop with Noodle in Soup",
    description: "Southeast Asian Noodles Tea Set · includes coffee/milk tea",
    price: 26,
    category: "mains",
    image: img,
    includesDrink: true,
  },

  // ——— Tea Set (with Coffee / Milk Tea) ———
  // Omitted sold out: Pork Chop Bun · French Fries
  {
    id: "chicken-wing-french-fries",
    name: "Chicken Wing · French Fries",
    description: "Tea Set · includes coffee/milk tea",
    price: 28,
    category: "mains",
    image: img,
    includesDrink: true,
  },
  {
    id: "crispy-bun-condensed-milk-butter",
    name: "Crispy Bun with Condensed Milk and Butter",
    description: "Tea Set · includes coffee/milk tea",
    price: 23,
    category: "snacks",
    image: img,
    includesDrink: true,
  },
  {
    id: "crispy-bun-condensed-milk-peanut-butter",
    name: "Crispy Bun with Condensed Milk and Peanut Butter",
    description: "Tea Set · includes coffee/milk tea",
    price: 23,
    category: "snacks",
    image: img,
    includesDrink: true,
  },

  // ——— Sandwich Set (with Coffee / Milk Tea) ———
  {
    id: "corned-beef-scrambled-egg-sandwich",
    name: "Corned Beef and Scrambled Egg Sandwich",
    description: "Sandwich Set · includes coffee/milk tea",
    price: 28,
    category: "mains",
    image: img,
    includesDrink: true,
  },
  {
    id: "luncheon-meat-scrambled-egg-sandwich",
    name: "Luncheon Meat and Scrambled Egg Sandwich",
    description: "Sandwich Set · includes coffee/milk tea",
    price: 26,
    category: "mains",
    image: img,
    includesDrink: true,
  },
  {
    id: "tomato-scrambled-egg-sandwich",
    name: "Tomato and Scrambled Egg Sandwich",
    description: "Sandwich Set · includes coffee/milk tea",
    price: 26,
    category: "mains",
    image: img,
    includesDrink: true,
  },
  {
    id: "ham-scrambled-egg-sandwich",
    name: "Ham and Scrambled Egg Sandwich",
    description: "Sandwich Set · includes coffee/milk tea",
    price: 26,
    category: "mains",
    image: img,
    includesDrink: true,
  },

  // ——— Toast Tea Set ———
  {
    id: "malaysian-kaya-toast",
    name: "Malaysian Kaya Toast",
    description: "Toast Tea Set · includes coffee/milk tea",
    price: 16,
    category: "snacks",
    image: img,
    includesDrink: true,
  },
  {
    id: "condensed-milk-peanut-toast",
    name: "Condensed Milk & Peanut Toast",
    description: "Toast Tea Set · includes coffee/milk tea",
    price: 16,
    category: "snacks",
    image: img,
    includesDrink: true,
  },
  {
    id: "coconut-toast",
    name: "Coconut Toast",
    description: "Toast Tea Set · includes coffee/milk tea",
    price: 16,
    category: "snacks",
    image: img,
    includesDrink: true,
  },

  // ——— Beverage: Hot Drink ———
  {
    id: "hot-coffee",
    name: "Hot Coffee",
    description: "Beverage · Hot Drink",
    price: 12,
    category: "drinks",
    image: img,
  },
  {
    id: "hot-black-coffee",
    name: "Hot Black Coffee",
    description: "Beverage · Hot Drink",
    price: 12,
    category: "drinks",
    image: img,
  },
  {
    id: "hot-milk-tea-hk",
    name: "Hot Milk Tea (HK Style)",
    description: "Beverage · Hot Drink",
    price: 12,
    category: "drinks",
    image: img,
  },
  {
    id: "coffee-and-tea-mix",
    name: "Coffee and Tea Mix",
    description: "Beverage · Hot Drink · yuenyeung",
    price: 12,
    category: "drinks",
    image: img,
  },
  {
    id: "hot-lemon-tea",
    name: "Hot Lemon Tea",
    description: "Beverage · Hot Drink",
    price: 12,
    category: "drinks",
    image: img,
  },
  {
    id: "hot-lemon-water",
    name: "Hot Lemon Water",
    description: "Beverage · Hot Drink",
    price: 12,
    category: "drinks",
    image: img,
  },

  // ——— Beverage: Cold Drink ———
  {
    id: "iced-coffee",
    name: "Iced Coffee",
    description: "Beverage · Cold Drink",
    price: 14,
    category: "drinks",
    image: img,
  },
  {
    id: "iced-black-coffee",
    name: "Iced Black Coffee",
    description: "Beverage · Cold Drink",
    price: 14,
    category: "drinks",
    image: img,
  },
  {
    id: "iced-milk-tea",
    name: "Iced Milk Tea",
    description: "Beverage · Cold Drink",
    price: 14,
    category: "drinks",
    image: img,
  },
  {
    id: "iced-coffee-and-tea",
    name: "Iced Coffee and Tea",
    description: "Beverage · Cold Drink · yuenyeung",
    price: 14,
    category: "drinks",
    image: img,
  },
  {
    id: "iced-lemon-tea",
    name: "Iced Lemon Tea",
    description: "Beverage · Cold Drink",
    price: 14,
    category: "drinks",
    image: img,
  },
  {
    id: "iced-lemon-water",
    name: "Iced Lemon Water",
    description: "Beverage · Cold Drink",
    price: 14,
    category: "drinks",
    image: img,
  },

  // ——— Beverage: Soft Drink ———
  // Omitted sold out: Pepsi Light
  {
    id: "pepsi",
    name: "Pepsi",
    description: "Beverage · Soft Drink",
    price: 12,
    category: "drinks",
    image: img,
  },
  {
    id: "7up",
    name: "7up",
    description: "Beverage · Soft Drink",
    price: 12,
    category: "drinks",
    image: img,
  },
  // Special Drink / Others — headers visible on kiosk; no items shown in photos
];
