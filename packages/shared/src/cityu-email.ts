import {
  isCampusEmail,
  validateCampusEmail,
} from "./campus";

const CITYU = "cityu" as const;

export function isCityUStudentEmail(email: string): boolean {
  return isCampusEmail(email, CITYU);
}

/** Returns an error message, or null when the email is a valid CityU address. */
export function validateCityUStudentEmail(email: string): string | null {
  return validateCampusEmail(email, CITYU);
}
