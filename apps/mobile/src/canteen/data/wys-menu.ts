import type { SimpleMenuItem } from "./simple-menu";
import { withRiceWithDishes } from "./rice-with-dishes";

const img = "https://placehold.co/200x200/png";

/** Wee Yu Sun Canteen / 三湘玥 — Hunan-style college canteen. */
const BASE: SimpleMenuItem[] = [
  {
    id: "rice-2-dishes",
    name: "2 Dishes + Rice (兩餸飯)",
    description: "Hunan-style two-dish rice set.",
    price: 33,
    category: "mains",
    image: img,
  },
  {
    id: "rice-3-dishes",
    name: "3 Dishes + Rice (三餸飯)",
    description: "Hunan-style three-dish rice set.",
    price: 40,
    category: "mains",
    image: img,
  },
  {
    id: "rice-1-dish",
    name: "1 Dish + Rice (單餸飯)",
    description: "Rice with 1 dish — choose at the counter.",
    price: 28,
    category: "mains",
    image: img,
  },
  {
    id: "hunan-noodles",
    name: "Hunan Noodles (湖南麵)",
    description: "Spicy Hunan-style noodle option.",
    price: 35,
    category: "mains",
    image: img,
  },
  {
    id: "dry-tossed-noodles",
    name: "Dry-Tossed Noodles (乾撈麵)",
    description: "Noodle option — confirm sauce at counter.",
    price: 32,
    category: "mains",
    image: img,
  },
  {
    id: "hot-soy-milk",
    name: "Hot Soy Milk (熱豆漿)",
    description: "Campus drink.",
    price: 10,
    category: "drinks",
    image: img,
  },
  {
    id: "iced-lemon-tea",
    name: "Iced Lemon Tea (凍檸茶)",
    description: "Refreshing iced lemon tea.",
    price: 12,
    category: "drinks",
    image: img,
  },
];

export const WYS_MENU: SimpleMenuItem[] = withRiceWithDishes(BASE);
