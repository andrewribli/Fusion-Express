/**
 * Timezone-safe canteen open/closed checks (Asia/Hong_Kong only).
 * Server and client both call `isOpen` — server is the source of truth at order time.
 */

import {
  getCanteenConfig,
  hktParts,
  type WeekdayRule,
} from "@/data/canteen/canteen-config";
import { canteenStatus, getCanteenMeta } from "@/lib/canteenConfig";

export { hktParts };

function dayAllowed(rule: WeekdayRule, day: number): boolean {
  switch (rule) {
    case "everyday":
    case "sun-open":
      return true;
    case "mon-fri":
      return day >= 1 && day <= 5;
    case "mon-sat":
      return day >= 1 && day <= 6;
    case "tue-sun":
      return day !== 6;
    default:
      return true;
  }
}

/**
 * Whether a canteen accepts new orders at `date` (default: now).
 * Coming-soon / unknown venues are never open for ordering.
 */
export function isOpen(canteenId: string, date: Date = new Date()): boolean {
  if (canteenStatus(canteenId) !== "open") return false;
  const cfg = getCanteenConfig(canteenId);
  if (!cfg) return false;
  const { minutes, day } = hktParts(date);
  if (!dayAllowed(cfg.weekdays, day)) return false;

  // Orchid Lodge: Sat closes at 17:00 (OpenRice).
  if (canteenId === "orchid-lodge" && day === 6) {
    const satOpen = 7 * 60 + 30;
    const satClose = 17 * 60;
    return minutes >= satOpen && minutes < satClose;
  }

  if (cfg.openMin === 0 && cfg.closeMin === 0) return false;
  return minutes >= cfg.openMin && minutes < cfg.closeMin;
}

/** Banner copy when closed — e.g. "SoraZen is closed. Opens Mon–Fri at 10:00." */
export function closedBanner(canteenId: string, date: Date = new Date()): string {
  const meta = getCanteenMeta(canteenId);
  const name = meta?.shortName ?? meta?.name ?? "This canteen";
  if (canteenStatus(canteenId) === "coming_soon") {
    return `${name} is coming soon.`;
  }
  const cfg = getCanteenConfig(canteenId);
  if (!cfg) return `${name} is currently closed.`;
  const { minutes, day } = hktParts(date);
  if (!dayAllowed(cfg.weekdays, day)) {
    return `${name} is closed today. ${cfg.hoursLabel}`;
  }
  if (minutes < cfg.openMin) {
    return `${name} is closed. Opens at ${cfg.nextOpenFallback}.`;
  }
  return `${name} is closed. ${cfg.hoursLabel}`;
}

export function assertCanteenOpenForOrder(canteenId: string, date = new Date()): void {
  if (!isOpen(canteenId, date)) {
    throw new Error(closedBanner(canteenId, date));
  }
}
