import {
  isGenericImageUrl,
  resolveProductImage,
} from "@fusion-express/shared/resolve-image";
import type { MenuCategory } from "@/lib/types";
import type { StoreSection } from "@/data/aisles";

export const SECTION_IMAGES: Record<StoreSection, string> = {
  dry: "/images/aisle-dry.png",
  refrigerated: "/images/aisle-refrigerated.png",
};

export const AISLE_IMAGES: Record<string, string> = {
  seasonings: "/images/aisles/condiments.jpg",
  tea: "/images/aisles/coffee-tea.jpg",
  toiletries: "/images/aisles/toiletries.jpg",
  "instant-noodles": "/images/aisles/instant-noodles.png",
  condiments: "/images/aisles/condiments.jpg",
  household: "/images/aisles/household-essentials.jpg",
  "canned-goods": "/images/aisles/canned-goods.jpg",
  sauces: "/images/aisles/condiments.jpg",
  "rice-noodles": "/images/aisles/rice-noodles.jpg",
  chips: "/images/aisles/snacks.jpg",
  pickles: "/images/aisles/canned-goods.jpg",
  crackers: "/images/aisles/snacks.jpg",
  biscuits: "/images/aisles/bread.jpg",
  "cleaning-supplies": "/images/aisles/household-essentials.jpg",
  snacks: "/images/aisles/snacks.jpg",
  confectionary: "/images/aisles/snacks.jpg",
  other: "/images/aisles/household-essentials.jpg",
  drinks: "/images/aisles/drinks.jpg",
  "hot-drinks": "/images/aisles/coffee-tea.jpg",
  "bread-and-bakery": "/images/aisles/bread.jpg",
  meat: "/images/aisles/meat.png",
  "meat-beef": "/images/aisles/meat.png",
  "meat-chicken": "/images/aisles/meat.png",
  "meat-pork": "/images/aisles/meat.png",
  "meat-other": "/images/aisles/meat.png",
  beef: "/images/aisles/meat.png",
  pork: "/images/aisles/meat.png",
  chicken: "/images/aisles/meat.png",
  others: "/images/aisles/meat.png",
  seafood: "/images/aisles/seafood.jpg",
  dairy: "/images/aisles/dairy-eggs.jpg",
  milk: "/images/aisles/dairy-eggs.jpg",
  cheese: "/images/aisles/dairy-eggs.jpg",
  yogurt: "/images/aisles/dairy-eggs.jpg",
  "butter-and-spreads": "/images/aisles/dairy-eggs.jpg",
  eggs: "/images/aisles/dairy-eggs.jpg",
  "ready-to-cook": "/images/aisles/meat.png",
  produce: "/images/aisles/fruit-veg.jpg",
  vegetables: "/images/aisles/fruit-veg.jpg",
  fruit: "/images/aisles/fruit-veg.jpg",
  "fruit-and-berries": "/images/aisles/fruit-veg.jpg",
  "frozen-food": "/images/aisles/frozen.jpg",
  "frozen-meals": "/images/aisles/frozen.jpg",
  "frozen-meat": "/images/aisles/frozen.jpg",
  "frozen-vegetables": "/images/aisles/frozen.jpg",
  "ice-cream": "/images/aisles/frozen.jpg",
  "ready-meals": "/images/aisles/salads.jpg",
  "chilled-drinks": "/images/aisles/chilled-drinks.jpg",
  "rice-and-grains": "/images/aisles/rice-noodles.jpg",
  noodles: "/images/aisles/instant-noodles.png",
  "tea-and-coffee": "/images/aisles/coffee-tea.jpg",
  cleaning: "/images/aisles/household-essentials.jpg",
  "paper-goods": "/images/aisles/household-essentials.jpg",
  "oils-and-vinegar": "/images/aisles/condiments.jpg",
  // legacy
  "dairy-eggs": "/images/aisles/dairy-eggs.jpg",
  frozen: "/images/aisles/frozen.jpg",
  salads: "/images/aisles/salads.jpg",
  bread: "/images/aisles/bread.jpg",
  "coffee-tea": "/images/aisles/coffee-tea.jpg",
  "household-essentials": "/images/aisles/household-essentials.jpg",
  "fruit-veg": "/images/aisles/fruit-veg.jpg",
};

export const CATEGORY_IMAGES: Record<MenuCategory, string> = {
  seasonings: AISLE_IMAGES.seasonings,
  tea: AISLE_IMAGES.tea,
  toiletries: AISLE_IMAGES.toiletries,
  "instant-noodles": AISLE_IMAGES["instant-noodles"],
  condiments: AISLE_IMAGES.condiments,
  household: AISLE_IMAGES.household,
  "canned-goods": AISLE_IMAGES["canned-goods"],
  sauces: AISLE_IMAGES.sauces,
  "rice-noodles": AISLE_IMAGES["rice-noodles"],
  chips: AISLE_IMAGES.chips,
  pickles: AISLE_IMAGES.pickles,
  crackers: AISLE_IMAGES.crackers,
  biscuits: AISLE_IMAGES.biscuits,
  "cleaning-supplies": AISLE_IMAGES["cleaning-supplies"],
  snacks: AISLE_IMAGES.snacks,
  other: AISLE_IMAGES.other,
  "instant-meals": AISLE_IMAGES["instant-noodles"],
  bread: AISLE_IMAGES.bread,
  meat: AISLE_IMAGES.meat,
  seafood: AISLE_IMAGES.seafood,
  "tofu-protein": AISLE_IMAGES["dairy-eggs"],
  "fruit-veg": AISLE_IMAGES["fruit-veg"],
  "dairy-eggs": AISLE_IMAGES["dairy-eggs"],
  frozen: AISLE_IMAGES.frozen,
  drinks: AISLE_IMAGES.drinks,
  "coffee-tea": AISLE_IMAGES["coffee-tea"],
  "household-essentials": AISLE_IMAGES["household-essentials"],
  salads: AISLE_IMAGES.salads,
  "chilled-drinks": AISLE_IMAGES["chilled-drinks"],
};

export function getSectionImage(section: StoreSection): string {
  return SECTION_IMAGES[section];
}

export function getAisleImage(aisleId: string): string {
  return AISLE_IMAGES[aisleId] ?? SECTION_IMAGES.dry;
}

export function getCategoryImage(category: MenuCategory | string): string {
  return (
    CATEGORY_IMAGES[category as MenuCategory] ?? AISLE_IMAGES.toiletries
  );
}

export function getItemImage(item: {
  id?: string;
  name?: string;
  image?: string;
  category: string;
}): string {
  const resolved = resolveProductImage(item);
  // Never show Unsplash / placehold / aisle stock photos as product images.
  if (resolved && !isGenericImageUrl(resolved)) return resolved;
  if (item.image && !isGenericImageUrl(item.image)) return item.image;
  return "";
}
