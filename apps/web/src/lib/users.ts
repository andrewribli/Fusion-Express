import type { UserProfile } from "@/context/UserContext";
import { omitUndefined } from "@/lib/omit-undefined";
import { collectionName } from "@/lib/constants";
import { isUserRole } from "@/lib/roles";
import { isPermissionDenied } from "@/lib/auth-errors";
import { getAuthClient, getDb, isFirebaseConfigured } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection, setDoc, Timestamp, deleteField } from "firebase/firestore";
import { detectCampusFromEmail } from "@fusion-express/shared/campus";
import { pickClientWritableUserFields } from "@/lib/user-writable-fields";
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
export { pickClientWritableUserFields } from "@/lib/user-writable-fields";

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
  const rest = pickClientWritableUserFields({
    ...(partial as Record<string, unknown>),
  });
  const payload = omitUndefined({
    ...rest,
    updatedAt: Timestamp.fromDate(new Date()),
  });
  const ref = doc(getDb(), USERS_COLLECTION, uid);
  try {
    await setDoc(ref, payload, { merge: true });
  } catch (err) {
    if (!isPermissionDenied(err)) throw err;
    const current = getAuthClient().currentUser;
    if (!current || current.uid !== uid) throw err;
    await current.getIdToken(true);
    await setDoc(ref, payload, { merge: true });
  }
}

/**
 * Local session from Auth only. Used when Firestore read/write fails so a
 * successful password sign-in is never treated as signed-out.
 * Never invents runnerCollege.
 */
export function sessionFromAuthIdentity(opts: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}): UserProfile {
  const email = opts.email?.trim().toLowerCase() || undefined;
  const campus = email ? detectCampusFromEmail(email) ?? undefined : undefined;
  const fullName =
    opts.displayName?.trim() ||
    email?.split("@")[0]?.trim() ||
    "Student";
  return {
    uid: opts.uid,
    email,
    fullName,
    campus,
    cuhkEmail: email,
    isGuest: false,
    isRunner: false,
    role: "customer",
    photoURL: opts.photoURL || undefined,
  };
}

/**
 * After Auth sign-in: load users/{uid}, or create a minimal customer profile
 * when Auth succeeded but the profile write never landed (e.g. older campus
 * rules). On permission errors, return a local session so Auth stays signed in.
 * Never touches runnerCollege.
 */
export async function ensureSignedInUserProfile(opts: {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
}): Promise<UserProfile> {
  const email = opts.email.trim().toLowerCase();
  const campus = detectCampusFromEmail(email) ?? undefined;
  const local = () =>
    sessionFromAuthIdentity({
      uid: opts.uid,
      email,
      displayName: opts.displayName,
      photoURL: opts.photoURL,
    });

  const current = getAuthClient().currentUser;
  if (current?.uid === opts.uid) {
    try {
      await current.getIdToken(true);
    } catch {
      // Token refresh is best-effort; Auth already succeeded.
    }
  }

  let profile = await fetchUserProfile(opts.uid);
  if (profile) {
    if (campus && !profile.campus) {
      try {
        await updateUserProfileDoc(opts.uid, { campus });
        profile = { ...profile, campus };
      } catch {
        // Campus backfill is best-effort; sign-in still proceeds.
      }
    }
    return profile;
  }

  // Distinguish a missing doc from a denied read before creating.
  try {
    const snap = await getDoc(doc(getDb(), USERS_COLLECTION, opts.uid));
    if (snap.exists()) {
      profile = parseUserDoc(opts.uid, snap.data() as Record<string, unknown>);
      if (campus && !profile.campus) {
        try {
          await updateUserProfileDoc(opts.uid, { campus });
          profile = { ...profile, campus };
        } catch {
          // ignore
        }
      }
      return profile;
    }
  } catch (err) {
    if (isPermissionDenied(err)) {
      // Own-doc read denied — keep the Auth session in the app.
      return local();
    }
    // Transient network: still land in the app with Auth identity.
    return local();
  }

  try {
    return await createUserProfile(opts.uid, {
      email,
      fullName: local().fullName,
      campus,
      cuhkEmail: email,
      isGuest: false,
      isRunner: false,
    });
  } catch {
    // Profile create denied or flaky — Auth already succeeded.
    return local();
  }
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
