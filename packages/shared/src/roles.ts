/**
 * Customer and runner are separate experiences. A user's `role` says which
 * experiences they signed up for; `AppMode` says which one they are looking at
 * right now. Someone with role "both" switches modes like Uber's driver toggle.
 */
export const USER_ROLES = ["customer", "runner", "both"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type AppMode = "customer" | "runner";

export const MODE_LABELS: Record<AppMode, string> = {
  customer: "Shopping",
  runner: "Runner Mode",
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

/**
 * Accounts created before roles existed only carry `isRunner`. Those users
 * signed up as customers and added runner access later, so they are "both".
 */
export function normalizeRole(value: unknown, isRunner = false): UserRole {
  if (isUserRole(value)) return value;
  return isRunner ? "both" : "customer";
}

export function roleAllowsRunner(role: UserRole): boolean {
  return role === "runner" || role === "both";
}

export function roleAllowsCustomer(role: UserRole): boolean {
  return role === "customer" || role === "both";
}

/** Only dual-role accounts get the Uber-style mode toggle. */
export function canSwitchModes(role: UserRole): boolean {
  return role === "both";
}

/** Applied when a customer accepts the runner terms. */
export function roleWithRunner(role: UserRole): UserRole {
  return role === "runner" ? "runner" : "both";
}

/** Where a role lands after sign-in when it has no saved mode preference. */
export function defaultModeForRole(role: UserRole): AppMode {
  return role === "runner" ? "runner" : "customer";
}

export function roleLabel(role: UserRole): string {
  if (role === "runner") return "Runner";
  if (role === "both") return "Customer & Runner";
  return "Customer";
}
