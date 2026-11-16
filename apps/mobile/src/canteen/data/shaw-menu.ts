import type { SimpleMenuItem } from "./simple-menu";
import { withRiceWithDishes } from "./rice-with-dishes";

const img = "https://placehold.co/200x200/png";

/** Shaw College canteen — starter menu with rice-with-dishes. */
const BASE: SimpleMenuItem[] = [
  {
    id: "chicken-rice",
    name: "Chicken Rice (雞飯)",
    description: "Casual chicken rice.",
    price: 38,
    category: "mains",
    image: img,
  },
  {
    id: "beef-noodles",
    name: "Beef Noodles (牛肉麵)",
    description: "Beef noodles in savory broth.",
    price: 40,
    category: "mains",
    image: img,
  },
  {
    id: "fried-rice",
    name: "Fried Rice (炒飯)",
    description: "Classic fried rice.",
    price: 36,
    category: "mains",
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

export const SHAW_MENU: SimpleMenuItem[] = withRiceWithDishes(BASE);
