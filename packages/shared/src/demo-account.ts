/** QA / video demo login. Not an admin and not a runner. */
export const DEMO_CUSTOMER_EMAIL = "demo@gracerun.fit";

/** Second demo login with admin privileges. No isDemo flag on user doc. */
export const ANDREW_DEMO_EMAIL = "andrew.demo@gracerun.fit";

/**
 * Never receive campaigns, broadcasts, or founder welcome mail.
 * Matched on email only — do not write isDemo on the user document.
 */
export const DO_NOT_EMAIL = [
  DEMO_CUSTOMER_EMAIL,
  ANDREW_DEMO_EMAIL,
  "demo@my.cityu.edu.hk",
  "runner@my.cityu.edu.hk",
] as const;

/** @gracerun.fit demo logins that pass CUHK campus email checks. */
export const DEMO_LOGIN_EMAILS = [
  DEMO_CUSTOMER_EMAIL,
  ANDREW_DEMO_EMAIL,
] as const;

export function normalizeAccountEmail(
  email: string | null | undefined,
): string {
  return email?.trim().toLowerCase() ?? "";
}

export function isDoNotEmailAddress(
  email: string | null | undefined,
): boolean {
  const value = normalizeAccountEmail(email);
  return (DO_NOT_EMAIL as readonly string[]).includes(value);
}

export function isDemoCustomerEmail(
  email: string | null | undefined,
): boolean {
  return normalizeAccountEmail(email) === DEMO_CUSTOMER_EMAIL;
}

export function isAndrewDemoEmail(
  email: string | null | undefined,
): boolean {
  return normalizeAccountEmail(email) === ANDREW_DEMO_EMAIL;
}

/** Any @gracerun.fit demo login allowed through CUHK campus gates. */
export function isDemoLoginEmail(
  email: string | null | undefined,
): boolean {
  const value = normalizeAccountEmail(email);
  return (DEMO_LOGIN_EMAILS as readonly string[]).includes(value);
}
