const ADMIN_UNLOCK_KEY = "gracerun_admin_unlocked";

/** PIN that unlocks the in-app admin dashboard (sessionStorage gate). */
export function getAdminPin(): string {
  return process.env.NEXT_PUBLIC_ADMIN_PIN?.trim() || "fusion2026";
}

export function isAdminUnlocked(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(ADMIN_UNLOCK_KEY) === "true";
}

export function unlockAdmin(pin: string): boolean {
  if (pin.trim() !== getAdminPin()) return false;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(ADMIN_UNLOCK_KEY, "true");
  }
  return true;
}

export function lockAdmin(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(ADMIN_UNLOCK_KEY);
  }
}
