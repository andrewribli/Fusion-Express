import type { SimpleMenuItem } from "@/data/canteen/simple-menu";

const img = "https://placehold.co/200x200/png";

/** Maxim's (by CUHK) — basic fast-food rice, noodles, breakfast. */
export const MAXIMS_MENU: SimpleMenuItem[] = [
  {
    id: "bbq-pork-rice",
    name: "BBQ Pork Rice (叉燒飯)",
    description: "Classic fast-food BBQ pork over rice.",
    price: 38,
    category: "mains",
    image: img,
  },
  {
    id: "curry-beef-brisket-rice",
    name: "Curry Beef Brisket Rice (咖喱牛腩飯)",
    description: "Curry brisket rice set.",
    price: 42,
    category: "mains",
    image: img,
  },
  {
    id: "tomato-pork-chop-rice",
    name: "Tomato Pork Chop Rice (番茄豬扒飯)",
    description: "Pork chop with tomato sauce over rice.",
    price: 40,
    category: "mains",
    image: img,
  },
  {
    id: "won-ton-noodles",
    name: "Won Ton Noodles (雲吞麵)",
    description: "Classic wonton noodle soup.",
    price: 36,
    category: "mains",
    image: img,
  },
  {
    id: "beef-brisket-noodles",
    name: "Beef Brisket Noodles (牛腩麵)",
    description: "Brisket noodle soup.",
    price: 40,
    category: "mains",
    image: img,
  },
  {
    id: "macaroni-soup-breakfast",
    name: "Macaroni Soup Breakfast (通粉早餐)",
    description: "Breakfast set — macaroni soup with toast/ham options.",
    price: 28,
    category: "mains",
    image: img,
    mealPeriods: ["breakfast"],
  },
  {
    id: "instant-noodle-set",
    name: "Instant Noodle Breakfast Set (公仔麵套餐)",
    description: "Breakfast instant noodles with sides.",
    price: 26,
    category: "mains",
    image: img,
    mealPeriods: ["breakfast"],
  },
  {
    id: "milk-tea",
    name: "Hong Kong Milk Tea (奶茶)",
    description: "Hot or iced — ask at counter.",
    price: 14,
    category: "drinks",
    image: img,
  },
  {
    id: "iced-lemon-tea",
    name: "Iced Lemon Tea (凍檸茶)",
    description: "Refreshing iced lemon tea.",
    price: 14,
    category: "drinks",
    image: img,
  },
];
