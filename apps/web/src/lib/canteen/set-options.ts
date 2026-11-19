import type {
  MenuOptionGroup,
  SelectedOptions,
} from "@fusion-express/shared/canteen-set-options";
import {
  labelForSelections,
  priceDeltaForSelections,
  variantIdSuffix,
} from "@fusion-express/shared/canteen-set-options";
import type { MenuItem } from "@/lib/types";
import type { SimpleMenuItem } from "@/data/canteen/simple-menu";
import type { RestaurantId } from "@/data/canteen/restaurants";
import { toCartMenuItemFromSimple } from "@/lib/canteen/cart";

export function buildConfiguredSimpleCartItem(
  item: SimpleMenuItem,
  restaurantId: RestaurantId,
  selected: SelectedOptions,
): MenuItem {
  const base = toCartMenuItemFromSimple(item, restaurantId);
  const groups = item.optionGroups as MenuOptionGroup[] | undefined;
  if (!groups?.length) return base;
  const extra = priceDeltaForSelections(groups, selected);
  const label = labelForSelections(groups, selected);
  const suffix = variantIdSuffix(selected);
  return {
    ...base,
    id: `${base.id}::${suffix}`,
    name: label ? `${item.name} (${label})` : item.name,
    price: item.price + extra,
    itemNote: [item.description, label ? `Options: ${label}` : null]
      .filter(Boolean)
      .join(" · "),
  };
}
