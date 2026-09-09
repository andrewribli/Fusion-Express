export const ESTIMATED_DELIVERY_MINUTES = 30;

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
  return (
    status === "pending" ||
    status === "assigned" ||
    status === "picked" ||
    status === "delivered"
  );
}

export const TIP_PRESETS = [0, 2, 5, 10] as const;

export const RUNNER_JUDGMENT_NOTE =
  "Runner will use best judgment for substitutions and discounts";

export const PRICES_DISCLAIMER =
  "Prices are estimates only — they are not accurate yet. Final amount is confirmed at pickup.";

