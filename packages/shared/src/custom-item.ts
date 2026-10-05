import type { MenuItem } from "./types";
import type { CampusId } from "./campus";
import {
  CUSTOM_ITEM_DEFAULT_WEIGHT_KG,
  RUNNER_JUDGMENT_NOTE,
} from "./constants";

export function createCustomMenuItem(
  name: string,
  options?: { weightKg?: number; estimatedPrice?: number; campus?: CampusId },
): MenuItem {
  const weightKg = options?.weightKg ?? CUSTOM_ITEM_DEFAULT_WEIGHT_KG;
  const estimatedPrice = options?.estimatedPrice;
  const hasEstimate =
    typeof estimatedPrice === "number" &&
    Number.isFinite(estimatedPrice) &&
    estimatedPrice > 0;

  return {
    id: `custom-${Date.now()}`,
    name: name.trim(),
    category: "snacks",
    price: hasEstimate ? estimatedPrice : 0,
    unit: "item",
    image: "/images/aisles/snacks.jpg",
    priceType: hasEstimate ? "fixed" : "variable",
    runnerInputsPrice: true,
    itemNote: RUNNER_JUDGMENT_NOTE,
    inStock: true,
    sortOrder: 9999,
    weightKg,
    campus: options?.campus,
  };
}
