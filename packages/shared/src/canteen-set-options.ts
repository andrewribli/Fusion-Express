/**
 * Multi-step canteen set options (protein → set drink).
 * Hot set drinks are free; iced set drinks are +$3 (not full à-la-carte).
 */

export type MenuOptionChoice = {
  id: string;
  label: string;
  /** Added to base item price (default 0). */
  priceDelta?: number;
};

export type MenuOptionGroup = {
  id: string;
  label: string;
  /** Max selections (default 1). */
  max?: number;
  /** Min selections (default 1 when required). */
  min?: number;
  required?: boolean;
  choices: MenuOptionChoice[];
};

/** Standard Chinese BBQ proteins for Chung Chi / S.H. Ho sets. */
export const BBQ_MEAT_CHOICES: MenuOptionChoice[] = [
  { id: "bbq-pork", label: "BBQ Pork" },
  { id: "steamed-chicken", label: "Steamed Chicken" },
  { id: "roasted-duck", label: "Roasted Duck" },
  { id: "soy-chicken", label: "Soy Chicken" },
];

/** Set drink: hot free / iced +$3. */
export const SET_DRINK_CHOICES: MenuOptionChoice[] = [
  { id: "hot-coffee", label: "Hot Coffee", priceDelta: 0 },
  { id: "iced-coffee", label: "Iced Coffee", priceDelta: 3 },
  { id: "hot-milk-tea", label: "Hot Milk Tea", priceDelta: 0 },
  { id: "iced-milk-tea", label: "Iced Milk Tea", priceDelta: 3 },
  { id: "hot-ovaltine", label: "Hot Ovaltine", priceDelta: 0 },
  { id: "iced-ovaltine", label: "Iced Ovaltine", priceDelta: 3 },
  { id: "hot-black-coffee", label: "Hot Black Coffee", priceDelta: 0 },
  { id: "iced-black-coffee", label: "Iced Black Coffee", priceDelta: 3 },
];

export function meatOptionGroup(max = 1): MenuOptionGroup {
  return {
    id: "meat",
    label: max > 1 ? `Select meat (${max} choices)` : "Select meat",
    required: true,
    min: max,
    max,
    choices: BBQ_MEAT_CHOICES,
  };
}

export function setDrinkOptionGroup(): MenuOptionGroup {
  return {
    id: "set-drink",
    label: "Set drink (hot free · iced +$3)",
    required: true,
    min: 1,
    max: 1,
    choices: SET_DRINK_CHOICES,
  };
}

/** BBQ Meat w/ Rice style: 1 protein + set drink. */
export function bbqSingleSetOptionGroups(): MenuOptionGroup[] {
  return [meatOptionGroup(1), setDrinkOptionGroup()];
}

/** BBQ Combo: 2 proteins + set drink. */
export function bbqComboSetOptionGroups(): MenuOptionGroup[] {
  return [meatOptionGroup(2), setDrinkOptionGroup()];
}

/** Three / four choice BBQ rice. */
export function bbqMultiSetOptionGroups(count: number): MenuOptionGroup[] {
  return [meatOptionGroup(count), setDrinkOptionGroup()];
}

/** Rice-with-dishes style set that still picks a set drink. */
export function riceSetWithDrinkOptionGroups(
  dishCount: number,
): MenuOptionGroup[] {
  return [
    {
      id: "dishes",
      label:
        dishCount === 1
          ? "Dish note (tell runner at pickup)"
          : `Dish notes (${dishCount} dishes — tell runner at pickup)`,
      required: false,
      min: 0,
      max: 1,
      choices: [
        {
          id: "counter-choice",
          label: "Choose dishes at the counter",
          priceDelta: 0,
        },
      ],
    },
    setDrinkOptionGroup(),
  ];
}

export type SelectedOptions = Record<string, string[]>;

export function optionSelectionsComplete(
  groups: MenuOptionGroup[] | undefined,
  selected: SelectedOptions,
): boolean {
  if (!groups?.length) return true;
  for (const g of groups) {
    const picks = selected[g.id] ?? [];
    const min = g.min ?? (g.required === false ? 0 : 1);
    const max = g.max ?? 1;
    if (picks.length < min || picks.length > max) return false;
  }
  return true;
}

export function priceDeltaForSelections(
  groups: MenuOptionGroup[] | undefined,
  selected: SelectedOptions,
): number {
  if (!groups?.length) return 0;
  let extra = 0;
  for (const g of groups) {
    const picks = selected[g.id] ?? [];
    for (const id of picks) {
      const choice = g.choices.find((c) => c.id === id);
      extra += choice?.priceDelta ?? 0;
    }
  }
  return extra;
}

export function labelForSelections(
  groups: MenuOptionGroup[] | undefined,
  selected: SelectedOptions,
): string {
  if (!groups?.length) return "";
  const parts: string[] = [];
  for (const g of groups) {
    const picks = selected[g.id] ?? [];
    if (!picks.length) continue;
    const labels = picks
      .map((id) => g.choices.find((c) => c.id === id)?.label ?? id)
      .join(", ");
    parts.push(labels);
  }
  return parts.join(" · ");
}

/** Stable cart variant suffix from selected option ids. */
export function variantIdSuffix(selected: SelectedOptions): string {
  const keys = Object.keys(selected).sort();
  const bits: string[] = [];
  for (const k of keys) {
    const vals = [...(selected[k] ?? [])].sort();
    if (vals.length) bits.push(`${k}=${vals.join("+")}`);
  }
  return bits.join("__") || "default";
}
