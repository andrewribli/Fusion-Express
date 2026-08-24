import type { MenuItem } from "@/lib/types";
import { RUNNER_JUDGMENT_NOTE } from "@/lib/constants";

export function createCustomMenuItem(name: string, weightKg = 0.3): MenuItem {
  return {
    id: `custom-${Date.now()}`,
    name: name.trim(),
    category: "snacks",
    price: 0,
    unit: "item",
    image: "/images/aisles/snacks.jpg",
    priceType: "variable",
    runnerInputsPrice: true,
    itemNote: RUNNER_JUDGMENT_NOTE,
    inStock: true,
    sortOrder: 9999,
    weightKg,
  };
}
