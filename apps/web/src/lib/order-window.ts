/**
 * Whether a venue can take an order right now, or at one future time.
 * Admins skip opening hours and holiday cutoffs only.
 * Coming-soon venues stay closed for everyone.
 */

import { isServiceOpen, SERVICE_HOURS } from "@/lib/constants";
import { isOrderableCanteen } from "@/lib/canteenConfig";
import { closedBanner, isOpen } from "@/lib/openingHours";
import { hktDateKey } from "@/lib/hk-public-holidays";
import { isCanteenOpenNow } from "@/lib/meal-search/open-status";
import {
  grocerySourceById,
  isGroceryOpen,
  type GrocerySourceId,
} from "@/lib/grocerySources";
import { getRestaurant, isOrderableRestaurant } from "@/ptero/config/canteen/restaurants";

export const ADMIN_ORDERING_NOTE = "Ordering is open because you are an admin.";

const MAX_SCHEDULE_MS = 14 * 24 * 60 * 60 * 1000;

export type OrderVenue =
  | { kind: "cuhk-canteen"; id: string }
  | { kind: "cityu-canteen"; id: string }
  | { kind: "grocery"; id: GrocerySourceId }
  | { kind: "fusion" };

export type WindowDecision = {
  allowed: boolean;
  /** Shut for hours, weekday, or holiday — not coming soon. */
  closed: boolean;
  orderable: boolean;
  /** An admin document may bypass this rejection. Past times and coming-soon cannot. */
  bypassable: boolean;
  message: string | null;
  adminNote: string | null;
};

function deny(
  message: string,
  extra?: Partial<Pick<WindowDecision, "closed" | "orderable" | "bypassable">>,
): WindowDecision {
  return {
    allowed: false,
    closed: extra?.closed ?? false,
    orderable: extra?.orderable ?? true,
    bypassable: extra?.bypassable ?? false,
    message,
    adminNote: null,
  };
}

function allow(adminNote: string | null, closed: boolean): WindowDecision {
  return {
    allowed: true,
    closed,
    orderable: true,
    bypassable: false,
    message: null,
    adminNote,
  };
}

export function canteenIdFromItemId(itemId: string): string {
  if (!itemId.startsWith("canteen:")) return "";
  const rest = itemId.slice("canteen:".length);
  const idx = rest.indexOf(":");
  return idx > 0 ? rest.slice(0, idx) : "";
}

export function resolveOrderVenue(input: {
  campus: "cuhk" | "cityu";
  itemIds: string[];
  sourceId?: string;
  orderChannel?: string;
  canteenRestaurantId?: string;
}): OrderVenue {
  const fromItems = [
    ...new Set(input.itemIds.map(canteenIdFromItemId).filter(Boolean)),
  ];
  const restaurantId =
    input.canteenRestaurantId?.trim() ||
    (fromItems.length === 1 ? fromItems[0] : "");
  if (restaurantId) {
    return input.campus === "cityu"
      ? { kind: "cityu-canteen", id: restaurantId }
      : { kind: "cuhk-canteen", id: restaurantId };
  }
  const wellcome =
    input.itemIds.some((id) => id.startsWith("wellcome:")) ||
    input.sourceId === "wellcome" ||
    input.orderChannel === "wellcome";
  if (wellcome) return { kind: "grocery", id: "wellcome" };
  if (input.campus === "cityu") return { kind: "grocery", id: "taste" };
  return { kind: "fusion" };
}

export function venueForCanteenId(canteenId: string): OrderVenue {
  if (getRestaurant(canteenId)) return { kind: "cityu-canteen", id: canteenId };
  return { kind: "cuhk-canteen", id: canteenId };
}

type VenueStatus = {
  orderable: boolean;
  open: boolean;
  message: string;
};

function venueStatus(venue: OrderVenue, at: Date): VenueStatus {
  if (venue.kind === "cuhk-canteen") {
    if (!isOrderableCanteen(venue.id)) {
      return { orderable: false, open: false, message: closedBanner(venue.id, at) };
    }
    const open = isOpen(venue.id, at);
    return { orderable: true, open, message: open ? "" : closedBanner(venue.id, at) };
  }
  if (venue.kind === "cityu-canteen") {
    const restaurant = getRestaurant(venue.id);
    const name = restaurant?.shortName ?? "This canteen";
    if (!isOrderableRestaurant(venue.id)) {
      return {
        orderable: false,
        open: false,
        message: `${name} isn't accepting orders yet.`,
      };
    }
    const open = isCanteenOpenNow("cityu", venue.id, at);
    const hours = restaurant?.hoursLabel ? ` ${restaurant.hoursLabel}` : "";
    return {
      orderable: true,
      open,
      message: open ? "" : `${name} is closed.${hours}`,
    };
  }
  if (venue.kind === "grocery") {
    const source = grocerySourceById(venue.id);
    const open = isGroceryOpen(venue.id, at);
    return {
      orderable: true,
      open,
      message: open
        ? ""
        : `${source.name} is closed (${source.hours.open}–${source.hours.close}).`,
    };
  }
  const open = isServiceOpen(at);
  return {
    orderable: true,
    open,
    message: open ? "" : `Fusion is closed. Pickup is ${SERVICE_HOURS.label}.`,
  };
}

export function immediateOrderDecision(
  venue: OrderVenue,
  opts: { isAdmin: boolean; at?: Date },
): WindowDecision {
  const status = venueStatus(venue, opts.at ?? new Date());
  if (!status.orderable) {
    return deny(status.message, { orderable: false, closed: false, bypassable: false });
  }
  if (status.open) return allow(null, false);
  if (opts.isAdmin) return allow(ADMIN_ORDERING_NOTE, true);
  return deny(status.message, { closed: true, orderable: true, bypassable: true });
}

export function parseScheduledFor(value: unknown): Date | null | "invalid" {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "invalid";
  return date;
}

/** Interpret a checkout date + time as Hong Kong time (no daylight saving). */
export function hktDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const parsed = new Date(`${date}T${time}:00+08:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function scheduledOrderDecision(
  venue: OrderVenue,
  when: Date,
  opts: { isAdmin: boolean; now?: Date },
): WindowDecision {
  const now = opts.now ?? new Date();
  if (Number.isNaN(when.getTime())) return deny("Pick a valid delivery time.");
  if (when.getTime() <= now.getTime()) return deny("Pick a future time.");
  if (when.getTime() - now.getTime() > MAX_SCHEDULE_MS) {
    return deny("Schedule within the next 14 days.");
  }
  const status = venueStatus(venue, when);
  if (!status.orderable) {
    return deny(status.message, { orderable: false, bypassable: false });
  }
  if (status.open) return allow(null, false);
  if (opts.isAdmin) return allow(ADMIN_ORDERING_NOTE, true);
  return deny(status.message || "That time is outside opening hours.", {
    closed: true,
    orderable: true,
    bypassable: true,
  });
}

export function resolveDeliveryTiming(input: {
  venue: OrderVenue;
  isAdmin: boolean;
  mode: "now" | "schedule";
  date: string;
  time: string;
  now?: Date;
}): { allowed: boolean; scheduledFor: string | null; error: string | null } {
  const now = input.now ?? new Date();
  if (input.mode === "now") {
    const decision = immediateOrderDecision(input.venue, {
      isAdmin: input.isAdmin,
      at: now,
    });
    return {
      allowed: decision.allowed,
      scheduledFor: null,
      error: decision.allowed ? null : decision.message,
    };
  }
  const when = hktDateTime(input.date, input.time);
  if (!when) {
    return { allowed: false, scheduledFor: null, error: "Pick a date and time." };
  }
  const decision = scheduledOrderDecision(input.venue, when, {
    isAdmin: input.isAdmin,
    now,
  });
  return {
    allowed: decision.allowed,
    scheduledFor: decision.allowed ? when.toISOString() : null,
    error: decision.allowed ? null : decision.message,
  };
}

export function formatScheduledLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-HK", {
    timeZone: "Asia/Hong_Kong",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function scheduleDateBounds(now = new Date()): { min: string; max: string } {
  const max = new Date(now.getTime() + MAX_SCHEDULE_MS);
  return { min: hktDateKey(now), max: hktDateKey(max) };
}
