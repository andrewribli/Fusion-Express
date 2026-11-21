import type { MenuOptionGroup } from "@fusion-express/shared/canteen-set-options";
import type { MenuCategory } from "./bf-menu";

/** Prefer placehold.co — via.placeholder.com is often blocked in browsers. */
export const CANTEEN_PLACEHOLDER_IMAGE = "https://placehold.co/200x200/png";


export type SimpleMenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  /** Prefer kiosk section labels (e.g. "Cart Noodles"); falls back to mains/snacks/drinks/dessert. */
  category: MenuCategory | string;
  image: string;
  /** Featured / house specialty badge when true. */
  signature?: boolean;
  /** Meal windows this item is sold (canteen period sections). */
  mealPeriods?: Array<"breakfast" | "lunch" | "tea" | "dinner">;
  /** Bento / set that already includes a drink. */
  includesDrink?: boolean;
  /** Optional add-drink surcharge shown as a variant. */
  drinkAddonPrice?: number;
  /** Multi-step set builder (meat → set drink, etc.). */
  optionGroups?: MenuOptionGroup[];
};
