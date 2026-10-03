export type MenuCategory = "mains" | "snacks" | "drinks" | "dessert";

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  image: string;
};

export const CATEGORY_LABELS: Record<MenuCategory, string> = {
  mains: "Mains",
  snacks: "Snacks",
  drinks: "Drinks",
  dessert: "Dessert",
};

/** Dummy Benjamin Franklin Canteen menu — HKD prices. */
export const MENU: MenuItem[] = [
  {
    id: "chicken-rice",
    name: "Chicken Rice",
    description: "Steamed chicken over fragrant rice with ginger sauce.",
    price: 28,
    category: "mains",
    image:
      "/canteen/food/bf-chicken-rice.jpg",
  },
  {
    id: "beef-noodles",
    name: "Beef Noodles",
    description: "Braised beef brisket with thick noodles in clear broth.",
    price: 38,
    category: "mains",
    image:
      "/canteen/food/bf-beef-noodles.jpg",
  },
  {
    id: "fried-rice",
    name: "Fried Rice",
    description: "Classic egg fried rice with veggies and soy.",
    price: 26,
    category: "mains",
    image:
      "/canteen/food/bf-fried-rice.jpg",
  },
  {
    id: "hotpot-set",
    name: "Hotpot Set",
    description: "Personal hotpot with soup base, meat, and veggies.",
    price: 55,
    category: "mains",
    image:
      "/canteen/food/hotpot-set.jpg",
  },
  {
    id: "sandwiches",
    name: "Sandwiches",
    description: "Fresh toast sandwich — ham & egg or tuna mayo.",
    price: 22,
    category: "snacks",
    image:
      "/canteen/food/sandwiches.jpg",
  },
  {
    id: "coffee",
    name: "Coffee",
    description: "Hot or iced drip coffee.",
    price: 15,
    category: "drinks",
    image:
      "/canteen/food/coffee.jpg",
  },
  {
    id: "milk-tea",
    name: "Milk Tea",
    description: "Hong Kong-style silk stocking milk tea.",
    price: 16,
    category: "drinks",
    image:
      "/canteen/food/milk-tea.jpg",
  },
  {
    id: "fruit-cup",
    name: "Fruit Cup",
    description: "Seasonal cut fruit, ready to go.",
    price: 18,
    category: "dessert",
    image:
      "/canteen/food/fruit-cup.jpg",
  },
  {
    id: "soup-of-the-day",
    name: "Soup of the Day",
    description: "Ask the counter — changes daily.",
    price: 20,
    category: "mains",
    image:
      "/canteen/food/soup-of-the-day.jpg",
  },
  {
    id: "curry-fish-balls",
    name: "Curry Fish Balls",
    description: "Street-style curry fish balls on sticks.",
    price: 18,
    category: "snacks",
    image:
      "/canteen/food/curry-fish-balls.jpg",
  },
  {
    id: "french-toast",
    name: "French Toast",
    description: "Thick-cut Hong Kong French toast with butter & syrup.",
    price: 24,
    category: "snacks",
    image:
      "/canteen/food/bf-french-toast.jpg",
  },
  {
    id: "egg-tart",
    name: "Egg Tart",
    description: "Flaky pastry with silky egg custard.",
    price: 12,
    category: "dessert",
    image:
      "/canteen/food/egg-tart.jpg",
  },
  {
    id: "pineapple-bun",
    name: "Pineapple Bun",
    description: "Crispy-topped bo lo bao, best with butter.",
    price: 10,
    category: "dessert",
    image:
      "/canteen/food/pineapple-bun.jpg",
  },
  {
    id: "iced-lemon-tea",
    name: "Iced Lemon Tea",
    description: "Refreshing iced tea with fresh lemon.",
    price: 14,
    category: "drinks",
    image:
      "/canteen/food/bf-iced-lemon-tea.jpg",
  },
  {
    id: "spring-rolls",
    name: "Spring Rolls",
    description: "Crispy vegetable spring rolls (3 pcs).",
    price: 20,
    category: "snacks",
    image:
      "/canteen/food/bf-spring-rolls.jpg",
  },
];

export function getMenuItem(id: string): MenuItem | undefined {
  return MENU.find((item) => item.id === id);
}

export function formatHkd(amount: number): string {
  return `HK$${amount.toFixed(amount % 1 === 0 ? 0 : 1)}`;
}
