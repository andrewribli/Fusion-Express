import type { SimpleMenuItem } from "./simple-menu";
import { withRiceWithDishes } from "./rice-with-dishes";

const img = "https://placehold.co/200x200/png";

/** Lee Woo Sing Canteen (WS Can) — rice/noodle basics. Cafe Tolo is separate. */
const BASE: SimpleMenuItem[] = [
  {
    id: "pork-cartilage-rice",
    name: "Pork Cartilage Rice (豬軟骨飯)",
    description: "Braised pork cartilage over rice.",
    price: 38,
    category: "mains",
    image: img,
  },
  {
    id: "fish-ball-noodles",
    name: "Fish Ball Noodles (魚蛋麵)",
    description: "Fish balls in noodle soup.",
    price: 32,
    category: "mains",
    image: img,
  },
  {
    id: "minced-beef-noodles",
    name: "Minced Beef Noodles (免治牛肉麵)",
    description: "Minced beef noodle option.",
    price: 34,
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

export const LWS_MENU: SimpleMenuItem[] = withRiceWithDishes(BASE);
