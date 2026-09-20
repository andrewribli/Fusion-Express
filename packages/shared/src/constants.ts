export const ESTIMATED_DELIVERY_MINUTES = 30;

/** Cart grocery subtotal cap. Runners front Fusion, so keep tickets small. */
export const MAX_ORDER_VALUE = 200;

export const ORDER_LIMIT_MESSAGE =
  `Maximum order value is ${MAX_ORDER_VALUE} HKD. Please remove items to proceed.`;

export function isOverOrderLimit(subtotal: number): boolean {
  return subtotal > MAX_ORDER_VALUE;
}

export const DEFAULT_SPECIAL_INSTRUCTIONS = "None for now";

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

/** Chat available once order is placed (prototype: coordinate anytime) */
export function isChatActive(status: string): boolean {
  const normalized = (() => {
    switch (status) {
      case "runner_assigned":
      case "assigned":
        return "accepted";
      case "picked_up":
      case "picked":
        return "purchased";
      case "completed":
        return "runner_paid";
      case "paid":
        return "customer_paid";
      default:
        return status;
    }
  })();
  return (
    normalized === "pending" ||
    normalized === "accepted" ||
    normalized === "purchased" ||
    normalized === "delivered" ||
    normalized === "runner_paid"
  );
}

export const TIP_PRESETS = [0, 2, 5, 10] as const;

export const RUNNER_JUDGMENT_NOTE =
  "Runner will use best judgment for substitutions and discounts";

export const PRICES_DISCLAIMER =
  "Prices in the app are estimates. The runner checks the actual Fusion store prices at pickup; if the real total is lower we refund the difference, and if it is higher you can approve the new total or cancel.";

/**
 * Custom items have no catalog weight. Customers do not set it — the fee uses
 * this flat estimate and the runner confirms the real weight at pickup.
 */
export const CUSTOM_ITEM_DEFAULT_WEIGHT_KG = 1;

export const PAYMENT_FLOW_STEPS = [
  "You pay nothing now. Order first — app prices are estimates.",
  "A runner accepts, buys the groceries, and enters the receipt total.",
  "They deliver to your lobby.",
  "You then pay the exact receipt total plus delivery via FPS or PayMe.",
] as const;

/** Fusion pickup hours. Runners shop then deliver to hall lobbies. */
export const SERVICE_HOURS = {
  timeZone: "Asia/Hong_Kong",
  /** 24h clock, inclusive start */
  openHour: 20,
  /** 24h clock, exclusive end (1am) */
  closeHour: 1,
  label: "8:00pm – 1:00am, Hong Kong time",
} as const;

export function hongKongHour(at = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: SERVICE_HOURS.timeZone,
    hour: "numeric",
    hour12: false,
  }).format(at);
  return Number(hour);
}

/** True during the nightly window, including midnight to 1am. */
export function isServiceOpen(at = new Date()): boolean {
  const hour = hongKongHour(at);
  return hour >= SERVICE_HOURS.openHour || hour < SERVICE_HOURS.closeHour;
}

export const WHY_GRACERUN = [
  {
    title: "Lobby delivery by students",
    body: "A CUHK student brings Fusion groceries to your hall lobby — not a street pin outside campus.",
  },
  {
    title: "A named runner you can rate",
    body: "You see who accepted the order. After delivery you rate them, so the next student knows who to trust.",
  },
  {
    title: "Actual Fusion shelf prices",
    body: "The app total is an estimate. The runner confirms the real Fusion shelf price; if the receipt is lower, the difference is refunded.",
  },
] as const;

export const FUSION_COORDS = { lat: 22.41955, lng: 114.20695 } as const;

