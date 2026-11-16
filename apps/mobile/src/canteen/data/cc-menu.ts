import type { SimpleMenuItem } from "./simple-menu";
import { withRiceWithDishes } from "./rice-with-dishes";

const img = "https://placehold.co/200x200/png";

/** Chung Chi Tang (众志堂) — CC college canteen staples. */
const BASE: SimpleMenuItem[] = [
  {
    id: "bbq-pork-rice",
    name: "BBQ Pork Rice (叉燒飯)",
    description: "Classic BBQ pork over rice.",
    price: 38,
    category: "mains",
    image: img,
  },
  {
    id: "curry-beef-rice",
    name: "Curry Beef Rice (咖喱牛肉飯)",
    description: "Curry beef over rice.",
    price: 40,
    category: "mains",
    image: img,
  },
  {
    id: "club-sandwich",
    name: "Club Sandwich (總匯三文治)",
    description: "Campus sandwich option.",
    price: 32,
    category: "mains",
    image: img,
  },
  {
    id: "ham-egg-sandwich",
    name: "Ham & Egg Sandwich (腿蛋三文治)",
    description: "Breakfast / light meal sandwich.",
    price: 22,
    category: "mains",
    image: img,
  },
  {
    id: "egg-tart",
    name: "Egg Tart (蛋撻)",
    description: "Baked egg tart.",
    price: 10,
    category: "snacks",
    image: img,
  },
  {
    id: "milk-tea",
    name: "Milk Tea (奶茶)",
    description: "Hot or iced.",
    price: 12,
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

export const CC_MENU: SimpleMenuItem[] = withRiceWithDishes(BASE);
