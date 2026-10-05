const KEY = "gracerun_cityu_hall";

export function rememberCityuHall(hall: string): void {
  if (typeof window === "undefined") return;
  if (hall.trim()) sessionStorage.setItem(KEY, hall.trim());
}

export function readCityuHall(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(KEY) ?? "";
}
