import { Image, type ImageSourcePropType } from "react-native";
import type { RestaurantId } from "./restaurants";

/**
 * Local Metro-bundled canteen card + dish images.
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
  avocado: require("../../assets/canteen/food/avocado.jpg"),
  waffle: require("../../assets/canteen/food/waffle.jpg"),
  omelette: require("../../assets/canteen/food/omelette.jpg"),
  fish: require("../../assets/canteen/food/fish.jpg"),
  dimsum: require("../../assets/canteen/food/dimsum.jpg"),
  wings: require("../../assets/canteen/food/wings.jpg"),
  fries: require("../../assets/canteen/food/fries.jpg"),
  bread: require("../../assets/canteen/food/bread.jpg"),
  pancake: require("../../assets/canteen/food/pancake.jpg"),
  coffee: require("../../assets/canteen/food/coffee.jpg"),
  latte: require("../../assets/canteen/food/latte.jpg"),
  tea: require("../../assets/canteen/food/tea.jpg"),
  boba: require("../../assets/canteen/food/boba.jpg"),
  milkshake: require("../../assets/canteen/food/milkshake.jpg"),
  juice: require("../../assets/canteen/food/juice.jpg"),
  cake: require("../../assets/canteen/food/cake.jpg"),
  icecream: require("../../assets/canteen/food/icecream.jpg"),
  dessert: require("../../assets/canteen/food/dessert.jpg"),
  cheesecake: require("../../assets/canteen/food/cheesecake.jpg"),
  lava: require("../../assets/canteen/food/lava.jpg"),
  cookies: require("../../assets/canteen/food/cookies.jpg"),
  soup: require("../../assets/canteen/food/soup.jpg"),
} as const;

const LOGOS = {
  paperAndCoffee: require("../../assets/canteen/paper-and-coffee-logo.png"),
  sorazen: require("../../assets/canteen/sorazen-logo.png"),
  collegeCanteen: require("../../assets/canteen/cuhk-college-canteen.png"),
} as const;

const BENJAMIN_FRANKLIN_PORTRAIT = require("../../assets/canteen/benjamin-franklin.jpg");

const FOOD_BY_FILE: Record<string, ImageSourcePropType> = Object.fromEntries(
  Object.entries(FOOD).map(([key, src]) => [`${key}.jpg`, src]),
);

const COVER_BY_ID: Record<RestaurantId, ImageSourcePropType> = {
  "benjamin-franklin": BENJAMIN_FRANKLIN_PORTRAIT,
  "uc-canteen": LOGOS.collegeCanteen,
  "cu-cafe": FOOD.latte,
  "sh-ho-canteen": LOGOS.collegeCanteen,
  "paper-and-coffee": LOGOS.paperAndCoffee,
  sorazen: LOGOS.sorazen,
  "na-canteen": LOGOS.collegeCanteen,
  "cafe-tolo": FOOD.waffle,
  "tuck-shop": FOOD.soup,
  ebenezers: FOOD.kebab,
  "cc-canteen": LOGOS.collegeCanteen,
  "shaw-canteen": LOGOS.collegeCanteen,
  "wys-canteen": LOGOS.collegeCanteen,
  maxims: FOOD.friedrice,
  "lws-canteen": LOGOS.collegeCanteen,
};

export function canteenCoverImage(
  restaurantId: RestaurantId | string,
): ImageSourcePropType {
  return COVER_BY_ID[restaurantId as RestaurantId] ?? FOOD.salad;
}

export function benjaminFranklinPortrait(): ImageSourcePropType {
  return BENJAMIN_FRANKLIN_PORTRAIT;
}

/** Resolve `/canteen/food/x.jpg` (or bare filename) to a Metro-bundled URI. */
export function resolveLocalFoodUri(image?: string | null): string | undefined {
  if (!image) return undefined;
  const match = image.match(/\/canteen\/food\/([^/?#]+)$/i);
  const file = match?.[1] ?? (image.includes("/") ? null : image);
  if (!file) return undefined;
  const src = FOOD_BY_FILE[file];
  if (!src) return undefined;
  const resolved = Image.resolveAssetSource(src);
  return resolved?.uri;
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
