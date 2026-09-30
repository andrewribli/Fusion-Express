import type { UserProfile } from "@/context/UserContext";
import { omitUndefined } from "@/lib/omit-undefined";
import { collectionName } from "@/lib/constants";
import { isUserRole } from "@/lib/roles";
import { isPermissionDenied } from "@/lib/auth-errors";
import { getAuthClient, getDb, isFirebaseConfigured } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection, setDoc, Timestamp, deleteField } from "firebase/firestore";
import {
  isCityUDirectoryUser,
  isOrphanUserProfile,
  parseUserDoc,
  selectAdminDirectoryUsers,
} from "@/lib/user-directory";

const USERS_COLLECTION = collectionName("users");

export type UserProfileDoc = UserProfile & {
  createdAt: Date;
  updatedAt: Date;
};

export { isOrphanUserProfile, parseUserDoc, isCityUDirectoryUser };

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  if (!isFirebaseConfigured()) return null;
  try {
    const snap = await getDoc(doc(getDb(), USERS_COLLECTION, uid));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    const profile = parseUserDoc(uid, data);
    if (!isUserRole(data.role)) {
      void updateUserProfileDoc(uid, { role: profile.role });
    }
    return profile;
  } catch {
    return null;
  }
}

/** Admin-only: security rules reject listing /users for everyone else. */
export async function fetchAllUsers(): Promise<{
  users: UserProfile[];
  hiddenOrphanCount: number;
}> {
  return fetchDirectoryUsers("cuhk");
}

export async function fetchDirectoryUsers(
  campus: "cuhk" | "cityu",
): Promise<{
  users: UserProfile[];
  hiddenOrphanCount: number;
}> {
  if (!isFirebaseConfigured()) return { users: [], hiddenOrphanCount: 0 };
  const snap = await getDocs(collection(getDb(), USERS_COLLECTION));
  const all = snap.docs.map((d) =>
    parseUserDoc(d.id, d.data() as Record<string, unknown>),
  );
  return {
    users: selectAdminDirectoryUsers(campus, all),
    hiddenOrphanCount: 0,
  };
}

export async function createUserProfile(
  uid: string,
  profile: Pick<UserProfile, "fullName"> & Partial<UserProfile>,
): Promise<UserProfile> {
  const now = new Date();
  const phone = profile.phone?.trim();
  const studentId = profile.studentId?.trim();
  const campus =
    profile.campus === "cuhk" || profile.campus === "cityu"
      ? profile.campus
      : undefined;
  const payload = {
    uid,
    fullName: profile.fullName,
    email: profile.email?.trim().toLowerCase(),
    phone: phone || undefined,
    studentId: studentId || undefined,
    // New accounts are customers. Runner access is a later terms-sheet write.
    role: "customer" as const,
    isRunner: false,
    isGuest: Boolean(profile.isGuest),
    campus,
    college: profile.college,
    hall: profile.hall,
    cuhkEmail: profile.cuhkEmail,
    cuhkVerifiedAt: profile.cuhkVerifiedAt,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  };
  if (isFirebaseConfigured()) {
    await writeOwnUserDoc(uid, omitUndefined(payload as Record<string, unknown>));
  }

  return {
    uid,
    fullName: profile.fullName,
    email: profile.email,
    phone: phone || profile.phone,
    studentId: studentId || undefined,
    role: "customer",
    isRunner: false,
    isGuest: Boolean(profile.isGuest),
    campus,
    college: profile.college,
    hall: profile.hall,
    cuhkEmail: profile.cuhkEmail,
    cuhkVerifiedAt: profile.cuhkVerifiedAt,
    createdAt: now.toISOString(),
  };
}

/**
 * First Firestore write after createUser can run before the ID token is
 * attached. One forced refresh, then the real rules error surfaces.
 */
async function writeOwnUserDoc(
  uid: string,
  data: Record<string, unknown>,
): Promise<void> {
  const ref = doc(getDb(), USERS_COLLECTION, uid);
  try {
    await setDoc(ref, data);
  } catch (err) {
    if (!isPermissionDenied(err)) throw err;
    const current = getAuthClient().currentUser;
    if (!current || current.uid !== uid) throw err;
    await current.getIdToken(true);
    await setDoc(ref, data);
  }
}

export async function updateUserProfileDoc(
  uid: string,
  partial: Partial<UserProfile>,
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const rest = { ...partial } as Record<string, unknown>;
  // Pseudonym and its cooldown are written by the delivery-identity API.
  // Nulls must not be stored: rules only allow a real string or a missing field.
  delete rest.pseudonym;
  delete rest.pseudonymChangedAt;
  // College lock and appeals are server-only.
  delete rest.runnerCollege;
  delete rest.runnerCollegeLockedAt;
  delete rest.runnerCollegeAppeal;
  if (rest.displayName == null) delete rest.displayName;
  if (rest.photoUrl == null) delete rest.photoUrl;
  if (rest.isAnonymous == null) delete rest.isAnonymous;
  await setDoc(
    doc(getDb(), USERS_COLLECTION, uid),
    omitUndefined({
      ...rest,
      updatedAt: Timestamp.fromDate(new Date()),
    }),
    { merge: true },
  );
}

export async function clearRunnerFromProfile(uid: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await setDoc(
    doc(getDb(), USERS_COLLECTION, uid),
    {
      isRunner: false,
      runnerId: deleteField(),
      runnerPaymentMethod: deleteField(),
      runnerPaymentId: deleteField(),
      updatedAt: Timestamp.fromDate(new Date()),
    },
    { merge: true },
  );
}
