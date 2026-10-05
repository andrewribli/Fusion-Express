/** CityU student email domains — mirrors CUHK `cuhk-email.ts`. */

export const CITYU_STUDENT_DOMAINS = ["cityu.edu.hk", "my.cityu.edu.hk"] as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isCityUStudentEmail(email: string): boolean {
  return validateCityUStudentEmail(email) === null;
}

/** Returns an error message, or null when the email is a valid CityU address. */
const OWNER_LOGIN_EMAILS = ["andrew.ribli@gmail.com"] as const;

export function validateCityUStudentEmail(email: string): string | null {
  const trimmed = normalizeEmail(email);
  if ((OWNER_LOGIN_EMAILS as readonly string[]).includes(trimmed)) return null;
  if (!trimmed.includes("@")) {
    return "Please use your CityU email to sign up.";
  }
  const domain = trimmed.split("@").pop() ?? "";
  if (!(CITYU_STUDENT_DOMAINS as readonly string[]).includes(domain)) {
    return "Please use your CityU email to sign up. (@cityu.edu.hk or @my.cityu.edu.hk)";
  }
  return null;
}
