/**
 * Campus identity for this deployment.
 *
 * Future merge: one multi-campus website will host every campus. Users pick
 * their campus on first visit (`cuhk` | `cityu` | later others). Catalog,
 * halls, supermarket, email domains, and order routing all hang off this
 * config. Keep `campus` on every stored user, product, and order so the
 * collections can be unioned without a migration rewrite.
 */
export type CampusId = "cuhk" | "cityu";

export const CAMPUS_ID: CampusId = "cityu";

export const CAMPUS = {
  id: CAMPUS_ID,
  name: "CityU",
  brandName: "Ptero",
  supermarket: "Taste",
  supermarketLocation: "Festival Walk",
  tagline: "Groceries from Taste to your CityU dorm lobby.",
  shortTagline: "Flying with grace.",
  emailDomains: ["cityu.edu.hk", "my.cityu.edu.hk"] as const,
  signupEmailError:
    "Please use your CityU email to sign up. (@cityu.edu.hk or @my.cityu.edu.hk)",
  accent: "#ED1C24",
} as const;

export function isCampusEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@").pop() ?? "";
  return (CAMPUS.emailDomains as readonly string[]).includes(domain);
}

export function validateCampusEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) {
    return CAMPUS.signupEmailError;
  }
  if (!isCampusEmail(trimmed)) {
    return CAMPUS.signupEmailError;
  }
  return null;
}
