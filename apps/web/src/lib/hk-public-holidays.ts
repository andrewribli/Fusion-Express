/**
 * Hong Kong general holidays (Asia/Hong_Kong calendar dates).
 * Refresh when the Labour Dept gazettes a new year:
 * https://www.labour.gov.hk/eng/news/holidays.htm
 */

const HK_PUBLIC_HOLIDAYS = new Set([
  // 2025
  "2025-01-01",
  "2025-01-29",
  "2025-01-30",
  "2025-01-31",
  "2025-04-04",
  "2025-04-18",
  "2025-04-19",
  "2025-04-21",
  "2025-05-01",
  "2025-05-05",
  "2025-05-31",
  "2025-07-01",
  "2025-10-01",
  "2025-10-07",
  "2025-10-29",
  "2025-12-25",
  "2025-12-26",
  // 2026
  "2026-01-01",
  "2026-02-17",
  "2026-02-18",
  "2026-02-19",
  "2026-04-03",
  "2026-04-04",
  "2026-04-06",
  "2026-04-07",
  "2026-05-01",
  "2026-05-25",
  "2026-06-19",
  "2026-07-01",
  "2026-09-26",
  "2026-10-01",
  "2026-10-19",
  "2026-12-25",
  "2026-12-26",
  // 2027
  "2027-01-01",
  "2027-02-06",
  "2027-02-08",
  "2027-02-09",
  "2027-03-26",
  "2027-03-27",
  "2027-03-29",
  "2027-04-05",
  "2027-05-01",
  "2027-05-13",
  "2027-06-09",
  "2027-07-01",
  "2027-09-16",
  "2027-10-01",
  "2027-10-07",
  "2027-12-25",
  "2027-12-27",
]);

/** YYYY-MM-DD in Asia/Hong_Kong for the given instant. */
export function hktDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isHkPublicHoliday(date: Date = new Date()): boolean {
  return HK_PUBLIC_HOLIDAYS.has(hktDateKey(date));
}
