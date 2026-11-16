import type { MenuCategory } from "@/data/canteen/bf-menu";
import type { RestaurantId } from "@/data/canteen/restaurants";
import { CAFE_TOLO_MENU } from "@/data/canteen/cafe-tolo-menu";
import { CC_MENU } from "@/data/canteen/cc-menu";
import { EBENEZERS_MENU } from "@/data/canteen/ebenezers-menu";
import { withFoodImages } from "@/data/canteen/food-images";
import { LWS_MENU } from "@/data/canteen/lws-menu";
import { MAXIMS_MENU } from "@/data/canteen/maxims-menu";
import { NA_MENU } from "@/data/canteen/na-menu";
import { PAPER_AND_COFFEE_MENU } from "@/data/canteen/paper-and-coffee-menu";
import { withRiceWithDishes } from "@/data/canteen/rice-with-dishes";
import { SHAW_MENU } from "@/data/canteen/shaw-menu";
import { SORAZEN_MENU } from "@/data/canteen/sorazen-menu";
import { TUCK_SHOP_MENU } from "@/data/canteen/tuck-shop-menu";
import { WYS_MENU } from "@/data/canteen/wys-menu";

/** Prefer placehold.co — via.placeholder.com is often blocked in browsers. */
export const CANTEEN_PLACEHOLDER_IMAGE = "https://placehold.co/200x200/png";

export type SimpleMenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
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

const img = CANTEEN_PLACEHOLDER_IMAGE;

/** CU Cafe — simplified generic grab-and-go menu. */
export const CU_CAFE_MENU: SimpleMenuItem[] = [
  {
    id: "turkey-breast-sandwich",
    name: "Turkey Breast Sandwich",
    description: "Turkey breast on fresh bread.",
    price: 38,
    category: "mains",
    image: img,
  },
  {
    id: "ham-cheese-sandwich",
    name: "Ham & Cheese Sandwich",
    description: "Classic ham and cheese.",
    price: 34,
    category: "mains",
    image: img,
  },
  {
    id: "egg-mayo-sandwich",
    name: "Egg Mayo Sandwich",
    description: "Creamy egg mayo on soft bread.",
    price: 30,
    category: "mains",
    image: img,
  },
  {
    id: "caesar-salad",
    name: "Caesar Salad",
    description: "Crisp romaine with Caesar dressing.",
    price: 42,
    category: "mains",
    image: img,
  },
  {
    id: "garden-salad",
    name: "Garden Salad",
    description: "Mixed greens with house dressing.",
    price: 36,
    category: "mains",
    image: img,
  },
  {
    id: "chicken-pasta",
    name: "Chicken Pasta",
    description: "Simple pasta with chicken — basic main.",
    price: 48,
    category: "mains",
    image: img,
  },
  {
    id: "house-brew-coffee",
    name: "House Brew Coffee",
    description: "Drip coffee.",
    price: 25,
    category: "drinks",
    image: img,
  },
  {
    id: "americano",
    name: "Americano",
    description: "Espresso with hot water.",
    price: 28,
    category: "drinks",
    image: img,
  },
  {
    id: "latte",
    name: "Latte",
    description: "Espresso with steamed milk.",
    price: 32,
    category: "drinks",
    image: img,
  },
  {
    id: "iced-lemon-tea",
    name: "Iced Lemon Tea",
    description: "Refreshing iced lemon tea.",
    price: 22,
    category: "drinks",
    image: img,
  },
  {
    id: "chocolate-cookie",
    name: "Chocolate Cookie",
    description: "Baked cookie snack.",
    price: 15,
    category: "snacks",
    image: img,
  },
];

export const SH_HO_MENU: SimpleMenuItem[] = withRiceWithDishes([
  {
    id: "chicken-rice",
    name: "Chicken Rice",
    description: "Casual Chinese chicken rice.",
    price: 42,
    category: "mains",
    image: img,
  },
  {
    id: "beef-noodles",
    name: "Beef Noodles",
    description: "Beef noodles in savory broth.",
    price: 45,
    category: "mains",
    image: img,
  },
  {
    id: "club-sandwich",
    name: "Club Sandwich",
    description: "Western-style club sandwich.",
    price: 38,
    category: "mains",
    image: img,
  },
  {
    id: "fried-rice",
    name: "Fried Rice",
    description: "Classic fried rice.",
    price: 40,
    category: "mains",
    image: img,
  },
  {
    id: "iced-lemon-tea",
    name: "Iced Lemon Tea",
    description: "Refreshing iced lemon tea.",
    price: 15,
    category: "drinks",
    image: img,
  },
]);

export type SimpleRestaurantId =
  | "cu-cafe"
  | "sh-ho-canteen"
  | "paper-and-coffee"
  | "sorazen"
  | "na-canteen"
  | "cafe-tolo"
  | "tuck-shop"
  | "ebenezers"
  | "cc-canteen"
  | "shaw-canteen"
  | "wys-canteen"
  | "maxims"
  | "lws-canteen";

export const SIMPLE_MENUS: Record<SimpleRestaurantId, SimpleMenuItem[]> = {
  "cu-cafe": CU_CAFE_MENU,
  "sh-ho-canteen": SH_HO_MENU,
  "paper-and-coffee": PAPER_AND_COFFEE_MENU,
  sorazen: SORAZEN_MENU,
  "na-canteen": withRiceWithDishes(NA_MENU),
  "cafe-tolo": CAFE_TOLO_MENU,
  "tuck-shop": TUCK_SHOP_MENU,
  ebenezers: EBENEZERS_MENU,
  "cc-canteen": CC_MENU,
  "shaw-canteen": SHAW_MENU,
  "wys-canteen": WYS_MENU,
  maxims: MAXIMS_MENU,
  "lws-canteen": LWS_MENU,
};

export function getSimpleMenu(
  restaurantId: string,
): SimpleMenuItem[] | undefined {
  if (restaurantId in SIMPLE_MENUS) {
    return withFoodImages(SIMPLE_MENUS[restaurantId as SimpleRestaurantId]);
  }
  return undefined;
}

export function isSimpleMenuRestaurant(
  id: string,
): id is SimpleRestaurantId {
  return id in SIMPLE_MENUS;
}
