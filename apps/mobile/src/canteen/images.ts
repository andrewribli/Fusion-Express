import type { ImageSourcePropType } from "react-native";
import type { RestaurantId } from "./restaurants";

/**
 * Local Metro-bundled canteen card images.
 * Benjamin Franklin uses a public-domain Duplessis portrait (Wikimedia Commons).
 */
const FOOD = {
  salad: require("../../assets/canteen/food/salad.jpg"),
  grill: require("../../assets/canteen/food/grill.jpg"),
  wrap: require("../../assets/canteen/food/wrap.jpg"),
  burger: require("../../assets/canteen/food/burger.jpg"),
  pizza: require("../../assets/canteen/food/pizza.jpg"),
  noodles: require("../../assets/canteen/food/noodles.jpg"),
  friedrice: require("../../assets/canteen/food/friedrice.jpg"),
  kebab: require("../../assets/canteen/food/kebab.jpg"),
  coffee: require("../../assets/canteen/food/coffee.jpg"),
  latte: require("../../assets/canteen/food/latte.jpg"),
  tea: require("../../assets/canteen/food/tea.jpg"),
  boba: require("../../assets/canteen/food/boba.jpg"),
  cake: require("../../assets/canteen/food/cake.jpg"),
  dessert: require("../../assets/canteen/food/dessert.jpg"),
  omelette: require("../../assets/canteen/food/omelette.jpg"),
  dimsum: require("../../assets/canteen/food/dimsum.jpg"),
  soup: require("../../assets/canteen/food/soup.jpg"),
  waffle: require("../../assets/canteen/food/waffle.jpg"),
} as const;

const LOGOS = {
  paperAndCoffee: require("../../assets/canteen/paper-and-coffee-logo.png"),
  sorazen: require("../../assets/canteen/sorazen-logo.png"),
} as const;

const BENJAMIN_FRANKLIN_PORTRAIT = require("../../assets/canteen/benjamin-franklin.jpg");

const COVER_BY_ID: Record<RestaurantId, ImageSourcePropType> = {
  "benjamin-franklin": BENJAMIN_FRANKLIN_PORTRAIT,
  "uc-canteen": FOOD.friedrice,
  "cu-cafe": FOOD.latte,
  "sh-ho-canteen": FOOD.noodles,
  "paper-and-coffee": LOGOS.paperAndCoffee,
  sorazen: LOGOS.sorazen,
  "na-canteen": FOOD.dimsum,
  "cafe-tolo": FOOD.waffle,
  "tuck-shop": FOOD.soup,
  ebenezers: FOOD.kebab,
  "cc-canteen": FOOD.grill,
  "shaw-canteen": FOOD.burger,
};

export function canteenCoverImage(
  restaurantId: RestaurantId | string,
): ImageSourcePropType {
  return (
    COVER_BY_ID[restaurantId as RestaurantId] ?? FOOD.salad
  );
}

export function benjaminFranklinPortrait(): ImageSourcePropType {
  return BENJAMIN_FRANKLIN_PORTRAIT;
}

/** Local food photo fallbacks by category for menu rows when remote URL fails. */
export function localFoodFallback(
  category: string | undefined,
): ImageSourcePropType {
  const c = (category ?? "").toLowerCase();
  if (/drink|tea|coffee|juice|beverage|boba|latte/.test(c)) return FOOD.coffee;
  if (/dessert|sweet|cake|ice/.test(c)) return FOOD.cake;
  if (/snack|side|bun|bread|dim/.test(c)) return FOOD.dimsum;
  return FOOD.grill;
}
