/**
 * Canteen menus — local copies under `./data/*` (EAS excludes apps/web).
 * Keep in sync with `apps/web/src/data/canteen/*`. Firestore items are seed-only.
 */
import {
  CATEGORY_LABELS,
  MENU as BF_MENU,
  type MenuCategory,
} from "./data/bf-menu";
import { CAFE_TOLO_MENU } from "./data/cafe-tolo-menu";
import { EBENEZERS_MENU } from "./data/ebenezers-menu";
import { canteenFoodImage, withFoodImages } from "./data/food-images";
import { NA_MENU } from "./data/na-menu";
import { PAPER_AND_COFFEE_MENU } from "./data/paper-and-coffee-menu";
import { SORAZEN_MENU } from "./data/sorazen-menu";
import { TUCK_SHOP_MENU } from "./data/tuck-shop-menu";
import { ucItemsForPeriod, type MealPeriod } from "./data/uc-menu";
import { resolveLocalFoodUri } from "./images";
import type { CanteenDish } from "./cart";
import type { RestaurantId } from "./restaurants";
import { menuReadyRestaurants } from "./restaurants";
import {
  getActiveMealPeriod,
  isCanteenOpenByConfig,
} from "@fusion-express/shared/canteen-hours";

export { CATEGORY_LABELS };
export type { MenuCategory, MealPeriod };

/** Mirror web `getCurrentUcPeriod` — null when UC closed. */
export function getCurrentUcPeriod(now = new Date()): MealPeriod | null {
  if (!isCanteenOpenByConfig("uc-canteen", now)) return null;
  return (getActiveMealPeriod(now) as MealPeriod | null) ?? null;
}

type SimpleRow = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: MenuCategory | string;
  image?: string;
  signature?: boolean;
};

const CU_CAFE_MENU: SimpleRow[] = [
  {
    id: "turkey-breast-sandwich",
    name: "Turkey Breast Sandwich",
    description: "Turkey breast on fresh bread — grab-and-go.",
    price: 38,
    category: "mains",
  },
  {
    id: "caesar-salad",
    name: "Caesar Salad",
    description: "Crisp romaine with classic Caesar dressing.",
    price: 42,
    category: "mains",
  },
  {
    id: "house-brew-coffee",
    name: "House Brew Coffee",
    description: "Premium drip coffee.",
    price: 25,
    category: "drinks",
  },
  {
    id: "matcha-latte",
    name: "Matcha Latte",
    description: "Smooth matcha with steamed milk.",
    price: 32,
    category: "drinks",
  },
  {
    id: "chocolate-cake",
    name: "Chocolate Cake",
    description: "Rich chocolate slice.",
    price: 28,
    category: "dessert",
  },
];

const SH_HO_MENU: SimpleRow[] = [
  {
    id: "chicken-rice",
    name: "Chicken Rice",
    description: "Casual Chinese chicken rice.",
    price: 42,
    category: "mains",
  },
  {
    id: "beef-noodles",
    name: "Beef Noodles",
    description: "Beef noodles in savory broth.",
    price: 45,
    category: "mains",
  },
  {
    id: "club-sandwich",
    name: "Club Sandwich",
    description: "Western-style club sandwich.",
    price: 38,
    category: "mains",
  },
  {
    id: "fried-rice",
    name: "Fried Rice",
    description: "Classic fried rice.",
    price: 40,
    category: "mains",
  },
  {
    id: "iced-lemon-tea",
    name: "Iced Lemon Tea",
    description: "Refreshing iced lemon tea.",
    price: 15,
    category: "drinks",
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

function asFoodCategory(category: string): MenuCategory {
  if (
    category === "mains" ||
    category === "snacks" ||
    category === "drinks" ||
    category === "dessert"
  ) {
    return category;
  }
  return mapUcCategory(category) as MenuCategory;
}

function resolveImage(
  id: string,
  category: string,
  image?: string,
): string | undefined {
  const withLocal = withFoodImages([
    {
      id,
      category: asFoodCategory(category),
      image: image ?? "",
    },
  ])[0];
  const path = withLocal.image || canteenFoodImage(id, asFoodCategory(category));
  return resolveLocalFoodUri(path) ?? path;
}

function toDish(row: SimpleRow): CanteenDish {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    category: String(row.category),
    image: resolveImage(row.id, String(row.category), row.image),
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
    return {
      dishes: withFoodImages(BF_MENU).map((item) =>
        toDish({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          image: item.image,
        }),
      ),
    };
  }

  if (restaurantId === "uc-canteen") {
    const period = opts?.ucPeriod ?? getCurrentUcPeriod() ?? "lunch";
    const rows = ucItemsForPeriod(period);
    return {
      dishes: rows.map((item) => {
        const category = mapUcCategory(item.category);
        return {
          id: item.id,
          name: item.nameZh ? `${item.name} (${item.nameZh})` : item.name,
          description: item.description,
          price: item.price,
          category,
          image: resolveImage(item.id, category),
        };
      }),
      mealPeriodLabel: period,
    };
  }

  const simple = SIMPLE[restaurantId as RestaurantId];
  if (simple) {
    const normalized = simple.map((row) => ({
      ...row,
      category: asFoodCategory(String(row.category)),
      image: row.image ?? "",
    }));
    return { dishes: withFoodImages(normalized).map(toDish) };
  }

  return { dishes: [] };
}

export type DishSearchHit = CanteenDish & {
  restaurantId: RestaurantId;
  restaurantName: string;
  restaurantShortName: string;
};

/** Global dish search across menu-ready canteens (home canteen tab). */
export function searchCanteenDishes(query: string): DishSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: DishSearchHit[] = [];
  for (const restaurant of menuReadyRestaurants()) {
    const { dishes } = loadCanteenMenu(restaurant.id);
    for (const dish of dishes) {
      if (
        dish.name.toLowerCase().includes(q) ||
        (dish.description ?? "").toLowerCase().includes(q)
      ) {
        hits.push({
          ...dish,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          restaurantShortName: restaurant.shortName,
        });
      }
    }
  }
  return hits;
}

export const CANTEEN_CATEGORY_ORDER: MenuCategory[] = [
  "mains",
  "snacks",
  "drinks",
  "dessert",
];

export type PriceSort = "default" | "cheap" | "expensive";

export function sortDishesByPrice<T extends { price: number }>(
  items: T[],
  sort: PriceSort,
): T[] {
  if (sort === "default") return items;
  const copy = [...items];
  copy.sort((a, b) =>
    sort === "cheap" ? a.price - b.price : b.price - a.price,
  );
  return copy;
}

export function categoryLabel(category: string): string {
  if (category in CATEGORY_LABELS) {
    return CATEGORY_LABELS[category as MenuCategory];
  }
  return category.charAt(0).toUpperCase() + category.slice(1);
}
