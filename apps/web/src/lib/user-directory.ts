import type { UserProfile } from "@/context/UserContext";
import {
  isUniversityEmailForCampus,
  type CampusId,
} from "@fusion-express/shared/campus";
import { isDemoCustomerEmail } from "@fusion-express/shared/demo-account";
import { normalizeRole } from "@/lib/roles";

type FirestoreDate = { toDate: () => Date };

function parseRunnerCollegeAppeal(
  value: unknown,
): UserProfile["runnerCollegeAppeal"] {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const status = row.status;
  if (status !== "pending" && status !== "approved" && status !== "rejected") {
    return null;
  }
  const submittedAt =
    row.submittedAt &&
    typeof row.submittedAt === "object" &&
    "toDate" in row.submittedAt
      ? (row.submittedAt as FirestoreDate).toDate().toISOString()
      : row.submittedAt
        ? String(row.submittedAt)
        : new Date().toISOString();
  return {
    requestedCollege: String(row.requestedCollege ?? ""),
    reason: String(row.reason ?? ""),
    submittedAt,
    status,
  };
}

export function parseUserDoc(
  uid: string,
  data: Record<string, unknown>,
): UserProfile {
  return {
    uid,
    email: data.email ? String(data.email) : undefined,
    fullName: String(data.fullName ?? ""),
    phone: data.phone ? String(data.phone) : undefined,
    isRunner: Boolean(data.isRunner),
    isGuest: Boolean(data.isGuest),
    createdAt:
      data.createdAt &&
      typeof data.createdAt === "object" &&
      "toDate" in data.createdAt
        ? (data.createdAt as FirestoreDate).toDate().toISOString()
        : data.createdAt
          ? String(data.createdAt)
          : undefined,
    role: normalizeRole(data.role, Boolean(data.isRunner)),
    runnerId: data.runnerId ? String(data.runnerId) : undefined,
    runnerPaymentMethod: data.runnerPaymentMethod as UserProfile["runnerPaymentMethod"],
    runnerPaymentId: data.runnerPaymentId ? String(data.runnerPaymentId) : undefined,
    termsAcceptedAt: data.termsAcceptedAt
      ? typeof data.termsAcceptedAt === "object" &&
        data.termsAcceptedAt &&
        "toDate" in data.termsAcceptedAt
        ? (data.termsAcceptedAt as FirestoreDate).toDate().toISOString()
        : String(data.termsAcceptedAt)
      : undefined,
    photoURL: data.photoURL ? String(data.photoURL) : undefined,
    displayName:
      typeof data.displayName === "string" && data.displayName.trim()
        ? data.displayName.trim()
        : null,
    photoUrl:
      typeof data.photoUrl === "string" && data.photoUrl.trim()
        ? data.photoUrl.trim()
        : null,
    isAnonymous: data.isAnonymous === true,
    pseudonym:
      typeof data.pseudonym === "string" && data.pseudonym.trim()
        ? data.pseudonym.trim()
        : null,
    pseudonymChangedAt:
      data.pseudonymChangedAt &&
      typeof data.pseudonymChangedAt === "object" &&
      "toDate" in data.pseudonymChangedAt
        ? (data.pseudonymChangedAt as FirestoreDate).toDate().toISOString()
        : data.pseudonymChangedAt
          ? String(data.pseudonymChangedAt)
          : null,
    campus:
      data.campus === "cuhk" || data.campus === "cityu"
        ? data.campus
        : undefined,
    cuhkEmail: data.cuhkEmail ? String(data.cuhkEmail) : undefined,
    cuhkVerifiedAt: data.cuhkVerifiedAt
      ? typeof data.cuhkVerifiedAt === "object" &&
        data.cuhkVerifiedAt &&
        "toDate" in data.cuhkVerifiedAt
        ? (data.cuhkVerifiedAt as FirestoreDate).toDate().toISOString()
        : String(data.cuhkVerifiedAt)
      : undefined,
    username: data.username ? String(data.username) : undefined,
    chineseName: data.chineseName ? String(data.chineseName) : undefined,
    studentId: data.studentId ? String(data.studentId) : undefined,
    college: data.college ? String(data.college) : undefined,
    runnerCollege: data.runnerCollege ? String(data.runnerCollege) : null,
    runnerCollegeLockedAt:
      data.runnerCollegeLockedAt &&
      typeof data.runnerCollegeLockedAt === "object" &&
      "toDate" in data.runnerCollegeLockedAt
        ? (data.runnerCollegeLockedAt as FirestoreDate).toDate().toISOString()
        : data.runnerCollegeLockedAt
          ? String(data.runnerCollegeLockedAt)
          : null,
    runnerCollegeAppeal: parseRunnerCollegeAppeal(data.runnerCollegeAppeal),
    hall: data.hall ? String(data.hall) : undefined,
    roomNumber: data.roomNumber ? String(data.roomNumber) : undefined,
  };
}

export const MISSING_DIRECTORY_NAME = "No name";
export const MISSING_DIRECTORY_EMAIL = "No email";

export function profileDirectoryName(profile: UserProfile): string {
  const fullName = profile.fullName?.trim() ?? "";
  if (fullName) return fullName;
  return profile.displayName?.trim() ?? "";
}

export function profileDirectoryEmail(profile: UserProfile): string {
  return (profile.email ?? profile.cuhkEmail ?? "").trim();
}

/** Listed row that is still missing a name, an email, or both. */
export function isIncompleteDirectoryProfile(profile: UserProfile): boolean {
  return !profileDirectoryName(profile) || !profileDirectoryEmail(profile);
}

export function directoryNameLabel(profile: UserProfile): string {
  return profileDirectoryName(profile) || MISSING_DIRECTORY_NAME;
}

export function directoryEmailLabel(profile: UserProfile): string {
  return profileDirectoryEmail(profile) || MISSING_DIRECTORY_EMAIL;
}

/** Firestore stub with no name and no email — usually anonymous Auth or a failed write. */
export function isOrphanUserProfile(profile: UserProfile): boolean {
  return !profileDirectoryName(profile) && !profileDirectoryEmail(profile);
}

export type AuthDirectoryContact = {
  email?: string;
  displayName?: string;
};

/**
 * Fill a blank Firestore name or email from Auth for display.
 * Does not set campus, so a CityU Auth email on an empty stub stays on the
 * CUHK list that already classified that stub as hidden.
 */
export function applyAuthContact(
  profile: UserProfile,
  auth: AuthDirectoryContact | undefined,
): UserProfile {
  if (!auth) return profile;
  const next: UserProfile = { ...profile };
  if (!profileDirectoryEmail(profile)) {
    const email = auth.email?.trim();
    if (email) next.email = email;
  }
  if (!profileDirectoryName(profile)) {
    const name = auth.displayName?.trim();
    if (name) next.fullName = name;
  }
  return next;
}

export function applyAuthContacts(
  users: UserProfile[],
  contacts: Record<string, AuthDirectoryContact | undefined>,
): UserProfile[] {
  return users.map((user) =>
    user.uid ? applyAuthContact(user, contacts[user.uid]) : user,
  );
}

/** CityU student email or a profile stamped `campus: cityu`. */
export function isCityUDirectoryUser(profile: UserProfile): boolean {
  const email = (profile.email ?? profile.cuhkEmail ?? "").trim();
  if (isUniversityEmailForCampus(email, "cityu")) return true;
  return profile.campus === "cityu";
}

/** Named accounts first. Rows with no name stay in the list, after the named ones. */
export function sortUsersByName(users: UserProfile[]): UserProfile[] {
  return [...users].sort((a, b) => {
    const aBlank = !profileDirectoryName(a);
    const bBlank = !profileDirectoryName(b);
    if (aBlank !== bBlank) return aBlank ? 1 : -1;
    const aKey = profileDirectoryName(a) || profileDirectoryEmail(a) || a.uid || "";
    const bKey = profileDirectoryName(b) || profileDirectoryEmail(b) || b.uid || "";
    return aKey.localeCompare(bKey, "en", { sensitivity: "base" });
  });
}

/**
 * Campus directory rows, including profiles with no name and/or no email.
 * CUHK is every account that is not a CityU directory user — blank stubs with
 * no email and no campus stay here, which is where the old hidden count lived.
 */
export function selectAdminDirectoryUsers(
  campus: CampusId | "all",
  profiles: UserProfile[],
): UserProfile[] {
  return sortUsersByName(
    profiles.filter((profile) => campusForAdminDirectory(campus, profile)),
  );
}

export function campusForAdminDirectory(
  campus: CampusId | "all",
  profile: UserProfile,
): boolean {
  if (campus === "all") return true;
  if (campus === "cityu") return isCityUDirectoryUser(profile);
  return !isCityUDirectoryUser(profile);
}

export function isDemoDirectoryProfile(profile: UserProfile): boolean {
  return isDemoCustomerEmail(profile.email ?? profile.cuhkEmail);
}

/** Hide the QA demo account unless the admin turns on "Show demo". */
export function filterDemoDirectoryUsers(
  users: UserProfile[],
  showDemo: boolean,
): UserProfile[] {
  if (showDemo) return users;
  return users.filter((profile) => !isDemoDirectoryProfile(profile));
}
