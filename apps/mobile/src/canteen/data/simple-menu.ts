import type { MenuCategory } from "./bf-menu";

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
