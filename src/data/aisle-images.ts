import type { MenuCategory } from "@/lib/types";
import type { StoreSection } from "@/data/aisles";

export const SECTION_IMAGES: Record<StoreSection, string> = {
  dry: "/images/aisle-dry.png",
  refrigerated: "/images/aisle-refrigerated.png",
};

export const AISLE_IMAGES: Record<string, string> = {
  meat: "/images/aisles/meat.png",
  seafood: "/images/aisles/seafood.jpg",
  "dairy-eggs": "/images/aisles/dairy-eggs.jpg",
  frozen: "/images/aisles/frozen.jpg",
  "chilled-drinks": "/images/aisles/chilled-drinks.jpg",
  salads: "/images/aisles/salads.jpg",
  "instant-noodles": "/images/aisles/instant-noodles.png",
  drinks: "/images/aisles/drinks.jpg",
  snacks: "/images/aisles/snacks.jpg",
  bread: "/images/aisles/bread.jpg",
  "rice-noodles": "/images/aisles/rice-noodles.jpg",
  "canned-goods": "/images/aisles/canned-goods.jpg",
  condiments: "/images/aisles/condiments.jpg",
  "coffee-tea": "/images/aisles/coffee-tea.jpg",
  toiletries: "/images/aisles/toiletries.jpg",
  "fruit-veg": "/images/aisles/fruit-veg.jpg",
};

export const CATEGORY_IMAGES: Record<MenuCategory, string> = {
  meat: AISLE_IMAGES.meat,
  seafood: AISLE_IMAGES.seafood,
  "dairy-eggs": AISLE_IMAGES["dairy-eggs"],
  frozen: AISLE_IMAGES.frozen,
  drinks: AISLE_IMAGES.drinks,
  "fruit-veg": AISLE_IMAGES["fruit-veg"],
  "instant-noodles": AISLE_IMAGES["instant-noodles"],
  "instant-meals": AISLE_IMAGES["instant-noodles"],
  bread: AISLE_IMAGES.bread,
  "rice-noodles": AISLE_IMAGES["rice-noodles"],
  snacks: AISLE_IMAGES.snacks,
  condiments: AISLE_IMAGES.condiments,
  "coffee-tea": AISLE_IMAGES["coffee-tea"],
  toiletries: AISLE_IMAGES.toiletries,
  "tofu-protein": AISLE_IMAGES["dairy-eggs"],
};

export function getSectionImage(section: StoreSection): string {
  return SECTION_IMAGES[section];
}

export function getAisleImage(aisleId: string): string {
  return AISLE_IMAGES[aisleId] ?? SECTION_IMAGES.dry;
}

export function getCategoryImage(category: MenuCategory): string {
  return CATEGORY_IMAGES[category];
}

export function getItemImage(item: {
  image?: string;
  category: MenuCategory;
}): string {
  if (item.image) return item.image;
  return getCategoryImage(item.category);
}
