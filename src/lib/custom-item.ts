import type { MenuItem } from "@/lib/types";
import { RUNNER_JUDGMENT_NOTE } from "@/lib/constants";

export function createCustomMenuItem(name: string): MenuItem {
  return {
    id: `custom-${Date.now()}`,
    name: name.trim(),
    category: "snacks",
    price: 0,
    unit: "item",
    priceType: "variable",
    runnerInputsPrice: true,
    itemNote: RUNNER_JUDGMENT_NOTE,
    inStock: true,
    sortOrder: 9999,
  };
}
