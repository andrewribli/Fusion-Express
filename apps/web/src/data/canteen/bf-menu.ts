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
      "https://images.unsplash.com/photo-1604908176997-125f25cc7f3d?w=400&h=400&fit=crop",
  },
  {
    id: "beef-noodles",
    name: "Beef Noodles",
    description: "Braised beef brisket with thick noodles in clear broth.",
    price: 38,
    category: "mains",
    image:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=400&fit=crop",
  },
  {
    id: "fried-rice",
    name: "Fried Rice",
    description: "Classic egg fried rice with veggies and soy.",
    price: 26,
    category: "mains",
    image:
      "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=400&fit=crop",
  },
  {
    id: "hotpot-set",
    name: "Hotpot Set",
    description: "Personal hotpot with soup base, meat, and veggies.",
    price: 55,
    category: "mains",
    image:
      "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop&sat=-20",
  },
  {
    id: "sandwiches",
    name: "Sandwiches",
    description: "Fresh toast sandwich — ham & egg or tuna mayo.",
    price: 22,
    category: "snacks",
    image:
      "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=400&fit=crop",
  },
  {
    id: "coffee",
    name: "Coffee",
    description: "Hot or iced drip coffee.",
    price: 15,
    category: "drinks",
    image:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop",
  },
  {
    id: "milk-tea",
    name: "Milk Tea",
    description: "Hong Kong-style silk stocking milk tea.",
    price: 16,
    category: "drinks",
    image:
      "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=400&fit=crop",
  },
  {
    id: "fruit-cup",
    name: "Fruit Cup",
    description: "Seasonal cut fruit, ready to go.",
    price: 18,
    category: "dessert",
    image:
      "https://images.unsplash.com/photo-1619566636858-adf3ef4644b9?w=400&h=400&fit=crop",
  },
  {
    id: "soup-of-the-day",
    name: "Soup of the Day",
    description: "Ask the counter — changes daily.",
    price: 20,
    category: "mains",
    image:
      "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=400&fit=crop",
  },
  {
    id: "curry-fish-balls",
    name: "Curry Fish Balls",
    description: "Street-style curry fish balls on sticks.",
    price: 18,
    category: "snacks",
    image:
      "https://images.unsplash.com/photo-1555939594-58ed7bd77b50?w=400&h=400&fit=crop",
  },
  {
    id: "french-toast",
    name: "French Toast",
    description: "Thick-cut Hong Kong French toast with butter & syrup.",
    price: 24,
    category: "snacks",
    image:
      "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&h=400&fit=crop",
  },
  {
    id: "egg-tart",
    name: "Egg Tart",
    description: "Flaky pastry with silky egg custard.",
    price: 12,
    category: "dessert",
    image:
      "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?w=400&h=400&fit=crop",
  },
  {
    id: "pineapple-bun",
    name: "Pineapple Bun",
    description: "Crispy-topped bo lo bao, best with butter.",
    price: 10,
    category: "dessert",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop",
  },
  {
    id: "iced-lemon-tea",
    name: "Iced Lemon Tea",
    description: "Refreshing iced tea with fresh lemon.",
    price: 14,
    category: "drinks",
    image:
      "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop",
  },
  {
    id: "spring-rolls",
    name: "Spring Rolls",
    description: "Crispy vegetable spring rolls (3 pcs).",
    price: 20,
    category: "snacks",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop",
  },
];

export function getMenuItem(id: string): MenuItem | undefined {
  return MENU.find((item) => item.id === id);
}

export function formatHkd(amount: number): string {
  return `HK$${amount.toFixed(amount % 1 === 0 ? 0 : 1)}`;
}
