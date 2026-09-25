import type { MenuCategory } from "@/data/canteen/bf-menu";
import type { RestaurantId } from "@/data/canteen/restaurants";
import { NA_MENU } from "@/data/canteen/na-menu";
import { PAPER_AND_COFFEE_MENU } from "@/data/canteen/paper-and-coffee-menu";
import { EBENEEZERS_MENU } from "@/data/canteen/ebeneezers-menu";
import { ORCHID_LODGE_MENU } from "@/data/canteen/orchid-lodge-menu";
import { SORAZEN_MENU } from "@/data/canteen/sorazen-menu";

export type SimpleMenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  /** True when the venue has not published a price. `price` is then 0. */
  priceOnRequest?: boolean;
  category: MenuCategory;
  image: string;
  /** Featured / house specialty badge when true. */
  signature?: boolean;
  /** Meal windows this item is sold (canteen period sections). */
  mealPeriods?: Array<"breakfast" | "lunch" | "tea" | "dinner">;
  /** Bento / set that already includes a drink. */
  includesDrink?: boolean;
  /** Optional add-drink surcharge shown as a variant. */
  drinkAddonPrice?: number;
};

export type SimpleRestaurantMenu = {
  restaurantId: RestaurantId;
  items: SimpleMenuItem[];
};


export const CU_CAFE_MENU: SimpleMenuItem[] = [
  {
    id: "turkey-breast-sandwich",
    name: "Turkey Breast Sandwich",
    description: "Turkey breast on fresh bread — grab-and-go.",
    price: 38,
    category: "mains",
    image: "/canteen/food/turkey-breast-sandwich.jpg",
  },
  {
    id: "caesar-salad",
    name: "Caesar Salad",
    description: "Crisp romaine with classic Caesar dressing.",
    price: 42,
    category: "mains",
    image: "/canteen/food/caesar-salad.jpg",
  },
  {
    id: "house-brew-coffee",
    name: "House Brew Coffee",
    description: "Premium drip coffee.",
    price: 25,
    category: "drinks",
    image: "/canteen/food/cucafe-house-brew-coffee.jpg",
  },
  {
    id: "matcha-latte",
    name: "Matcha Latte",
    description: "Smooth matcha with steamed milk.",
    price: 32,
    category: "drinks",
    image: "/canteen/food/matcha-latte.jpg",
  },
  {
    id: "chocolate-cake",
    name: "Chocolate Cake",
    description: "Rich chocolate slice.",
    price: 28,
    category: "dessert",
    image: "/canteen/food/chocolate-cake.jpg",
  },
];

export const SH_HO_MENU: SimpleMenuItem[] = [
  {
    id: "chicken-rice",
    name: "Chicken Rice",
    description: "Casual Chinese chicken rice.",
    price: 42,
    category: "mains",
    image: "/canteen/food/shho-chicken-rice.jpg",
  },
  {
    id: "beef-noodles",
    name: "Beef Noodles",
    description: "Beef noodles in savory broth.",
    price: 45,
    category: "mains",
    image: "/canteen/food/shho-beef-noodles.jpg",
  },
  {
    id: "club-sandwich",
    name: "Club Sandwich",
    description: "Western-style club sandwich.",
    price: 38,
    category: "mains",
    image: "/canteen/food/club-sandwich.jpg",
  },
  {
    id: "fried-rice",
    name: "Fried Rice",
    description: "Classic fried rice.",
    price: 40,
    category: "mains",
    image: "/canteen/food/shho-fried-rice.jpg",
  },
  {
    id: "iced-lemon-tea",
    name: "Iced Lemon Tea",
    description: "Refreshing iced lemon tea.",
    price: 15,
    category: "drinks",
    image: "/canteen/food/shho-iced-lemon-tea.jpg",
  },
];

export type SimpleRestaurantId =
  | "cu-cafe"
  | "sh-ho-canteen"
  | "paper-and-coffee"
  | "sorazen"
  | "na-canteen"
  | "ebeneezers"
  | "orchid-lodge";

export const SIMPLE_MENUS: Record<SimpleRestaurantId, SimpleMenuItem[]> = {
  "cu-cafe": CU_CAFE_MENU,
  "sh-ho-canteen": SH_HO_MENU,
  "paper-and-coffee": PAPER_AND_COFFEE_MENU,
  sorazen: SORAZEN_MENU,
  "na-canteen": NA_MENU,
  ebeneezers: EBENEEZERS_MENU,
  "orchid-lodge": ORCHID_LODGE_MENU,
};

export function getSimpleMenu(
  restaurantId: string,
): SimpleMenuItem[] | undefined {
  if (restaurantId in SIMPLE_MENUS) {
    return SIMPLE_MENUS[restaurantId as SimpleRestaurantId];
  }
  return undefined;
}

export function isSimpleMenuRestaurant(
  id: string,
): id is SimpleRestaurantId {
  return id in SIMPLE_MENUS;
}
