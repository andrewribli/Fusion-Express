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
import { CC_MENU } from "./data/cc-menu";
import { CU_CAFE_MENU } from "./data/cu-cafe-menu";
import { EBENEZERS_MENU } from "./data/ebenezers-menu";
import { canteenFoodImage, withFoodImages } from "./data/food-images";
import { LEE_WOO_SING_GREEN_MENU } from "./data/lee-woo-sing-green-menu";
import { LWS_MENU } from "./data/lws-menu";
import { MAXIMS_MENU } from "./data/maxims-menu";
import { NA_MENU } from "./data/na-menu";
import { PAPER_AND_COFFEE_MENU } from "./data/paper-and-coffee-menu";
import { withRiceWithDishes } from "./data/rice-with-dishes";
import { SHAW_MENU } from "./data/shaw-menu";
import { SORAZEN_MENU } from "./data/sorazen-menu";
import { TUCK_SHOP_MENU } from "./data/tuck-shop-menu";
import { ucItemsForPeriod, type MealPeriod } from "./data/uc-menu";
import { WYS_MENU } from "./data/wys-menu";

import { resolveLocalFoodUri } from "./images";
import type { CanteenDish } from "./cart";
import type { RestaurantId } from "./restaurants";
import { menuReadyRestaurants } from "./restaurants";
import {
  getActiveMealPeriod,
  getCanteenConfig,
  isCanteenOpenByConfig,
  type MealPeriodId,
} from "@fusion-express/shared/canteen-hours";
import type { MenuOptionGroup } from "@fusion-express/shared/canteen-set-options";
import {
  bbqSingleSetOptionGroups,
  setDrinkOptionGroup,
} from "@fusion-express/shared/canteen-set-options";

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
  includesDrink?: boolean;
  drinkAddonPrice?: number;
  mealPeriods?: MealPeriodId[];
  optionGroups?: MenuOptionGroup[];
};

const SH_HO_MENU: SimpleRow[] = withRiceWithDishes([
  {
    id: "shho-bbq-meat-rice",
    name: "BBQ Meat w/ Rice Set",
    description: "Chinese BBQ set · pick meat + set drink (hot free · iced +$3)",
    price: 34,
    category: "mains",
    image: "",
    mealPeriods: ["lunch", "dinner"],
    includesDrink: true,
    optionGroups: bbqSingleSetOptionGroups(),
  },
  {
    id: "shho-bbq-combo-rice",
    name: "BBQ Combo w/ Rice Set",
    description: "Two BBQ meats with rice · set drink included",
    price: 38,
    category: "mains",
    image: "",
    mealPeriods: ["lunch", "dinner"],
    includesDrink: true,
    optionGroups: [
      {
        id: "meat",
        label: "Select meat (2 choices)",
        required: true,
        min: 2,
        max: 2,
        choices: [
          { id: "bbq-pork", label: "BBQ Pork" },
          { id: "steamed-chicken", label: "Steamed Chicken" },
          { id: "roasted-duck", label: "Roasted Duck" },
          { id: "soy-chicken", label: "Soy Chicken" },
        ],
      },
      setDrinkOptionGroup(),
    ],
  },
  {
    id: "chicken-rice",
    name: "Chicken Rice",
    description: "Casual Chinese chicken rice · set drink optional",
    price: 42,
    category: "mains",
    image: "",
    mealPeriods: ["lunch", "dinner"],
    includesDrink: true,
    optionGroups: [setDrinkOptionGroup()],
  },
  {
    id: "beef-noodles",
    name: "Beef Noodles",
    description: "Beef noodles in savory broth.",
    price: 45,
    category: "mains",
    image: "",
    mealPeriods: ["lunch", "dinner"],
  },
  {
    id: "club-sandwich",
    name: "Club Sandwich",
    description: "Western-style club sandwich.",
    price: 38,
    category: "mains",
    image: "",
    mealPeriods: ["lunch", "tea"],
  },
  {
    id: "fried-rice",
    name: "Fried Rice",
    description: "Classic fried rice · set drink optional",
    price: 40,
    category: "mains",
    image: "",
    mealPeriods: ["lunch", "dinner"],
    includesDrink: true,
    optionGroups: [setDrinkOptionGroup()],
  },
  {
    id: "shho-breakfast-set",
    name: "Breakfast Set",
    description: "Breakfast · toast / noodles board · set drink",
    price: 28,
    category: "mains",
    image: "",
    mealPeriods: ["breakfast"],
    includesDrink: true,
    optionGroups: [setDrinkOptionGroup()],
  },
  {
    id: "iced-lemon-tea",
    name: "Iced Lemon Tea",
    description: "Refreshing iced lemon tea.",
    price: 15,
    category: "drinks",
    image: "",
    mealPeriods: ["breakfast", "lunch", "tea", "dinner"],
  },
]);

const SIMPLE: Partial<Record<RestaurantId, SimpleRow[]>> = {
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
  "lee-woo-sing-green": LEE_WOO_SING_GREEN_MENU,
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
    optionGroups: row.optionGroups,
  };
}

function mealPeriodsForRow(row: SimpleRow): MealPeriodId[] {
  if (row.mealPeriods?.length) return row.mealPeriods;
  const d = `${row.name} ${row.description ?? ""}`.toLowerCase();
  if (d.includes("早餐") || d.includes("breakfast")) return ["breakfast"];
  if (d.includes("午餐") || d.includes("lunch")) return ["lunch", "dinner"];
  if (d.includes("tea") || d.includes("茶")) return ["tea"];
  if (String(row.category) === "drinks") {
    return ["breakfast", "lunch", "tea", "dinner"];
  }
  return ["lunch", "tea", "dinner"];
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
    const cfg = getCanteenConfig(restaurantId);
    const active = getActiveMealPeriod() as MealPeriodId | null;
    let rows = simple;
    // Filter to the live meal period while open. Outside periods (closed /
    // overnight / between slots) still show the full menu for browsing —
    // ordering stays gated by isCanteenOpenByConfig in the UI.
    if (cfg?.mealPeriods && active) {
      rows = simple.filter((row) => mealPeriodsForRow(row).includes(active));
    }
    const normalized = rows.map((row) => ({
      ...row,
      category: asFoodCategory(String(row.category)),
      image: row.image ?? "",
    }));
    return {
      dishes: withFoodImages(normalized).map(toDish),
      mealPeriodLabel: cfg?.mealPeriods ? active ?? undefined : undefined,
    };
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

/** Cheapest menu item price for a venue (for list price sorting). */
export function minMenuPrice(restaurantId: string): number {
  const { dishes } = loadCanteenMenu(restaurantId);
  if (!dishes.length) return Number.POSITIVE_INFINITY;
  return Math.min(...dishes.map((d) => d.price));
}

export const CANTEEN_CATEGORY_ORDER: MenuCategory[] = [
  "mains",
  "snacks",
  "drinks",
  "dessert",
];

export type PriceSort = "default" | "cheap" | "expensive";
export type CanteenListSort = PriceSort | "distance";

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
