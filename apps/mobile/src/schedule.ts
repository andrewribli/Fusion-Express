/** Shared Hong Kong schedule copy for checkout, track, and runner. */

export const SCHEDULE_HORIZON_DAYS = 7;
export const SHOPPING_LEAD_MS = 30 * 60 * 1000;

/** Customer-facing delivery arrival time (exact `scheduledFor`). */
export function formatScheduled(at: Date): string {
  return at.toLocaleString("en-HK", {
    timeZone: "Asia/Hong_Kong",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function defaultScheduleSlot(from = new Date()): Date {
  const next = new Date(from.getTime() + 60 * 60 * 1000);
  next.setSeconds(0, 0);
  const minute = next.getMinutes();
  next.setMinutes(minute < 30 ? 30 : 60, 0, 0);
  return next;
}

export function scheduleBounds(now = new Date()): { min: Date; max: Date } {
  const min = new Date(now.getTime() + 30 * 60 * 1000);
  const max = new Date(now);
  max.setDate(max.getDate() + SCHEDULE_HORIZON_DAYS);
  max.setHours(21, 30, 0, 0);
  return { min, max };
}

export function clampSchedule(value: Date, now = new Date()): Date {
  const { min, max } = scheduleBounds(now);
  if (value.getTime() < min.getTime()) return min;
  if (value.getTime() > max.getTime()) return max;
  return value;
}
