/**
 * Multi-campus GraceRun config.
 *
 * Adding PolyU / HKU = new entry in `campusConfig` + locations/delivery data.
 * Campus is chosen at signup (step 1) or guest checkout — never on a homepage
 * landing page. Menus, dorms, email domains, and brand chrome hang off this
 * map. Persist `campus` on users and orders.
 */

export type CampusId = "cuhk" | "cityu";

export const CAMPUS_IDS: readonly CampusId[] = ["cuhk", "cityu"] as const;

export type CampusGroceryChannel = "fusion" | "taste";
export type CampusFoodChannel = "canteen";

export interface CampusConfig {
  id: CampusId;
  name: string;
  /** Header / chrome label, e.g. "GraceRun CUHK". */
  brandLabel: string;
  supermarket: string;
  supermarketLocation: string;
  groceryChannel: CampusGroceryChannel;
  groceryPath: string;
  channelHomePath: string;
  tagline: string;
  emailDomains: readonly string[];
  /** Short error when email domain does not match this campus. */
  signupEmailError: string;
  accent: string;
}

export const campusConfig: Record<CampusId, CampusConfig> = {
  cuhk: {
    id: "cuhk",
    name: "CUHK",
    brandLabel: "GraceRun CUHK",
    supermarket: "Fusion",
    supermarketLocation: "Benjamin Franklin Centre",
    groceryChannel: "fusion",
    groceryPath: "/fusion",
    channelHomePath: "/cuhk",
    tagline: "Groceries from Fusion to your CUHK dorm lobby.",
    emailDomains: ["link.cuhk.edu.hk", "cuhk.edu.hk"],
    signupEmailError: "Please use your CUHK email",
    accent: "#ED1C24",
  },
  cityu: {
    id: "cityu",
    name: "CityU",
    brandLabel: "Ptero",
    supermarket: "Taste",
    supermarketLocation: "Festival Walk",
    groceryChannel: "taste",
    groceryPath: "/cityu/taste",
    channelHomePath: "/cityu",
    tagline: "Groceries from Taste to your CityU dorm lobby.",
    emailDomains: ["cityu.edu.hk", "my.cityu.edu.hk"],
    signupEmailError: "Please use your CityU email",
    accent: "#ED1C24",
  },
};

export function isCampusId(value: unknown): value is CampusId {
  return value === "cuhk" || value === "cityu";
}

/** Profiles and orders from before multi-campus have no campus; they are CUHK. */
export function resolveCampus(value: unknown): CampusId {
  return isCampusId(value) ? value : "cuhk";
}

export function getCampusConfig(campus: CampusId): CampusConfig {
  return campusConfig[campus];
}

/** Supermarket the runner shops at for a grocery order ("Fusion" / "Taste"). */
export function supermarketForCampus(campus: unknown): string {
  return campusConfig[resolveCampus(campus)].supermarket;
}

export function supermarketPickupLocation(campus: unknown): string {
  const cfg = campusConfig[resolveCampus(campus)];
  return `${cfg.supermarket} supermarket, ${cfg.supermarketLocation}, ${cfg.name}`;
}

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split("@").pop() ?? "";
}

export function detectCampusFromEmail(email: string): CampusId | null {
  const domain = emailDomain(email);
  for (const id of CAMPUS_IDS) {
    if ((campusConfig[id].emailDomains as readonly string[]).includes(domain)) {
      return id;
    }
  }
  return null;
}

export function isCampusEmail(email: string, campus: CampusId): boolean {
  const domain = emailDomain(email);
  return (campusConfig[campus].emailDomains as readonly string[]).includes(
    domain,
  );
}

/** Returns an error message, or null when the email matches the campus. */
export function validateCampusEmail(
  email: string,
  campus: CampusId,
): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) {
    return campusConfig[campus].signupEmailError;
  }
  if (!isCampusEmail(trimmed, campus)) {
    return campusConfig[campus].signupEmailError;
  }
  return null;
}

/** Any supported university email (CUHK or CityU). */
export function isAnyCampusEmail(email: string): boolean {
  return detectCampusFromEmail(email) !== null;
}

export function validateAnyCampusEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) {
    return "Enter a valid university email address";
  }
  if (!isAnyCampusEmail(trimmed)) {
    return "Please use your CUHK or CityU email";
  }
  return null;
}
