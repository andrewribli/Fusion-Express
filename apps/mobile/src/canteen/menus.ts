/**
 * Canteen menus — same static TS source of truth as web
 * (`apps/web/src/data/canteen/*`). Firestore `canteens/{id}/items` is seed-only.
 */
import { webAssetOrigin } from "@fusion-express/shared/products";
import {
  CATEGORY_LABELS,
  MENU as BF_MENU,
  type MenuCategory,
} from "../../../web/src/data/canteen/bf-menu";
import { CAFE_TOLO_MENU } from "../../../web/src/data/canteen/cafe-tolo-menu";
import { EBENEZERS_MENU } from "../../../web/src/data/canteen/ebenezers-menu";
import { NA_MENU } from "../../../web/src/data/canteen/na-menu";
import { PAPER_AND_COFFEE_MENU } from "../../../web/src/data/canteen/paper-and-coffee-menu";
import { SORAZEN_MENU } from "../../../web/src/data/canteen/sorazen-menu";
import { TUCK_SHOP_MENU } from "../../../web/src/data/canteen/tuck-shop-menu";
import {
  UC_MEAL_PERIODS,
  ucItemsForPeriod,
  type MealPeriod,
} from "../../../web/src/data/canteen/uc-menu";
import type { CanteenDish } from "./cart";
import type { RestaurantId } from "./restaurants";

export { CATEGORY_LABELS };
export type { MenuCategory, MealPeriod };

/** Mirror web `lib/canteen/hours.getCurrentUcPeriod` without pulling web aliases. */
export function getCurrentUcPeriod(now = new Date()): MealPeriod | null {
  // UC closed Sundays
  if (now.getDay() === 0) return null;
  const mins = now.getHours() * 60 + now.getMinutes();
  const periods = Object.entries(UC_MEAL_PERIODS) as Array<
    [MealPeriod, (typeof UC_MEAL_PERIODS)[MealPeriod]]
  >;
  for (const [id, meta] of periods) {
    if (mins >= meta.startMin && mins < meta.endMin) return id;
  }
  return null;
}

const PLACEHOLDER = "https://placehold.co/200x200/png";

type SimpleRow = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: MenuCategory | string;
  image?: string;
};

const CU_CAFE_MENU: SimpleRow[] = [
  {
    id: "turkey-breast-sandwich",
    name: "Turkey Breast Sandwich",
    description: "Turkey breast on fresh bread — grab-and-go.",
    price: 38,
    category: "mains",
    image: PLACEHOLDER,
  },
  {
    id: "caesar-salad",
    name: "Caesar Salad",
    description: "Crisp romaine with classic Caesar dressing.",
    price: 42,
    category: "mains",
    image: PLACEHOLDER,
  },
  {
    id: "house-brew-coffee",
    name: "House Brew Coffee",
    description: "Premium drip coffee.",
    price: 25,
    category: "drinks",
    image: PLACEHOLDER,
  },
  {
    id: "matcha-latte",
    name: "Matcha Latte",
    description: "Smooth matcha with steamed milk.",
    price: 32,
    category: "drinks",
    image: PLACEHOLDER,
  },
  {
    id: "chocolate-cake",
    name: "Chocolate Cake",
    description: "Rich chocolate slice.",
    price: 28,
    category: "dessert",
    image: PLACEHOLDER,
  },
];

const SH_HO_MENU: SimpleRow[] = [
  {
    id: "chicken-rice",
    name: "Chicken Rice",
    description: "Casual Chinese chicken rice.",
    price: 42,
    category: "mains",
    image: PLACEHOLDER,
  },
  {
    id: "beef-noodles",
    name: "Beef Noodles",
    description: "Beef noodles in savory broth.",
    price: 45,
    category: "mains",
    image: PLACEHOLDER,
  },
  {
    id: "club-sandwich",
    name: "Club Sandwich",
    description: "Western-style club sandwich.",
    price: 38,
    category: "mains",
    image: PLACEHOLDER,
  },
  {
    id: "fried-rice",
    name: "Fried Rice",
    description: "Classic fried rice.",
    price: 40,
    category: "mains",
    image: PLACEHOLDER,
  },
  {
    id: "iced-lemon-tea",
    name: "Iced Lemon Tea",
    description: "Refreshing iced lemon tea.",
    price: 15,
    category: "drinks",
    image: PLACEHOLDER,
  },
];

const SIMPLE: Partial<Record<RestaurantId, SimpleRow[]>> = {
  "cu-cafe": CU_CAFE_MENU,
  "sh-ho-canteen": SH_HO_MENU,
  "paper-and-coffee": PAPER_AND_COFFEE_MENU,
  sorazen: SORAZEN_MENU,
  "na-canteen": NA_MENU,
  "cafe-tolo": CAFE_TOLO_MENU,
  "tuck-shop": TUCK_SHOP_MENU,
  ebenezers: EBENEZERS_MENU,
};

function resolveImage(image?: string): string | undefined {
  if (!image) return undefined;
  if (image.startsWith("http")) return image;
  if (image.startsWith("/")) return `${webAssetOrigin()}${image}`;
  return image;
}

function toDish(row: SimpleRow): CanteenDish {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    category: String(row.category),
    image: resolveImage(row.image),
  };
}

function mapUcCategory(raw: string): string {
  const s = raw.toLowerCase();
  if (/drink|tea|coffee|juice|beverage|soup/.test(s)) return "drinks";
  if (/dessert|sweet|cake|ice/.test(s)) return "dessert";
  if (/snack|side|bun|bread|dim/.test(s)) return "snacks";
  return "mains";
}

export type CanteenMenuResult = {
  dishes: CanteenDish[];
  /** UC meal period label when applicable */
  mealPeriodLabel?: string;
};

export function loadCanteenMenu(
  restaurantId: string,
  opts?: { ucPeriod?: MealPeriod },
): CanteenMenuResult {
  if (restaurantId === "benjamin-franklin") {
    return { dishes: BF_MENU.map(toDish) };
  }

  if (restaurantId === "uc-canteen") {
    const period = opts?.ucPeriod ?? getCurrentUcPeriod() ?? "lunch";
    const rows = ucItemsForPeriod(period);
    return {
      dishes: rows.map((item) => ({
        id: item.id,
        name: item.nameZh ? `${item.name} (${item.nameZh})` : item.name,
        description: item.description,
        price: item.price,
        category: mapUcCategory(item.category),
        image: PLACEHOLDER,
      })),
      mealPeriodLabel: period,
    };
  }

  const simple = SIMPLE[restaurantId as RestaurantId];
  if (simple) {
    return { dishes: simple.map(toDish) };
  }

  return { dishes: [] };
}

export const CANTEEN_CATEGORY_ORDER: MenuCategory[] = [
  "mains",
  "snacks",
  "drinks",
  "dessert",
];

export function categoryLabel(category: string): string {
  if (category in CATEGORY_LABELS) {
    return CATEGORY_LABELS[category as MenuCategory];
  }
  return category.charAt(0).toUpperCase() + category.slice(1);
}
