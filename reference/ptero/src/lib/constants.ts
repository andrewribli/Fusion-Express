import { CAMPUS } from "@/config/campus";

export const ESTIMATED_DELIVERY_MINUTES = 30;
export const MAX_ORDER_VALUE = 200;
export const DEFAULT_SPECIAL_INSTRUCTIONS = "None for now";
export const TIP_PRESETS = [0, 2, 5, 10] as const;

export const ORDER_LIMIT_MESSAGE = `Maximum order value is ${MAX_ORDER_VALUE} HKD. Please remove items to proceed.`;

export function isOverOrderLimit(subtotal: number): boolean {
  return subtotal > MAX_ORDER_VALUE;
}

export function resolveSpecialInstructions(note?: string | null): string {
  return note?.trim() || DEFAULT_SPECIAL_INSTRUCTIONS;
}

export function getEstimatedDeliveryTime(from: Date = new Date()): Date {
  return new Date(from.getTime() + ESTIMATED_DELIVERY_MINUTES * 60 * 1000);
}

export function formatEta(date: Date): string {
  return date.toLocaleTimeString("en-HK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const PAYMENT_FLOW_STEPS = [
  "You pay nothing now. Order first — app prices are estimates.",
  `A runner accepts, buys the groceries at ${CAMPUS.supermarket}, and enters the receipt total.`,
  "They deliver to your hall lobby.",
  "You then pay the exact receipt total plus delivery via Airwallex.",
] as const;

export const SERVICE_HOURS = {
  timeZone: "Asia/Hong_Kong",
  openHour: 20,
  closeHour: 1,
  label: "8:00pm – 1:00am, Hong Kong time",
} as const;

export const WHY_GRACERUN = [
  {
    title: "Lobby delivery by students",
    body: `A CityU student brings ${CAMPUS.supermarket} groceries to your hall lobby — not a street pin outside campus.`,
  },
  {
    title: "A named runner you can follow",
    body: "You see who accepted the order. After delivery you pay the exact Taste receipt plus the delivery fee.",
  },
  {
    title: `Actual ${CAMPUS.supermarket} shelf prices`,
    body: `The app total is an estimate. The runner confirms the real ${CAMPUS.supermarket} shelf price at Festival Walk.`,
  },
] as const;

export const PRICES_DISCLAIMER = `Prices in the app are estimates. The runner checks the actual ${CAMPUS.supermarket} store prices at pickup; if the real total is lower we refund the difference, and if it is higher you can approve the new total or cancel.`;
