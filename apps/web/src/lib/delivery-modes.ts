export type DeliveryMode = "direct" | "saver" | "standard" | "scheduled";

export const DELIVERY_MODES: {
  id: DeliveryMode;
  label: string;
  hint: string;
}[] = [
  {
    id: "direct",
    label: "Direct",
    hint: "Faster handoff · +HK$29",
  },
  {
    id: "saver",
    label: "Saver",
    hint: "A little slower · −HK$5",
  },
  {
    id: "standard",
    label: "Standard",
    hint: "Default campus delivery",
  },
  {
    id: "scheduled",
    label: "Scheduled",
    hint: "Pick your drop-off time",
  },
];

/** Direct = fee+29; Standard = fee; Saver = fee-5 (floor 0); Scheduled = fee. */
export function adjustedDeliveryFee(
  baseFee: number,
  mode: DeliveryMode,
): number {
  const fee = Math.max(0, baseFee);
  if (mode === "direct") return fee + 29;
  if (mode === "saver") return Math.max(0, fee - 5);
  return fee;
}
