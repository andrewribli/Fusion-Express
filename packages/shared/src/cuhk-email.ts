const CUHK_STUDENT_DOMAINS = ["link.cuhk.edu.hk", "cuhk.edu.hk"] as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isCuhkStudentEmail(email: string): boolean {
  return validateCuhkStudentEmail(email) === null;
}

/** Returns an error message, or null when the email is a valid CUHK address. */
export function validateCuhkStudentEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) {
    return "Enter a valid CUHK student email address";
  }
  const domain = trimmed.split("@").pop() ?? "";
  if (!CUHK_STUDENT_DOMAINS.includes(domain as (typeof CUHK_STUDENT_DOMAINS)[number])) {
    return "Use your CUHK email (@link.cuhk.edu.hk)";
  }
  return null;
}
