import type { UserProfile } from "@/context/UserContext";
import { omitUndefined } from "@/lib/omit-undefined";
import { collectionName } from "@/lib/constants";
import { normalizeRole, isUserRole } from "@/lib/roles";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection, setDoc, Timestamp, deleteField } from "firebase/firestore";

const USERS_COLLECTION = collectionName("users");

export type UserProfileDoc = UserProfile & {
  createdAt: Date;
  updatedAt: Date;
};

function parseUserDoc(uid: string, data: Record<string, unknown>): UserProfile {
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
        ? (data.createdAt as Timestamp).toDate().toISOString()
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
        ? (data.termsAcceptedAt as Timestamp).toDate().toISOString()
        : String(data.termsAcceptedAt)
      : undefined,
    photoURL: data.photoURL ? String(data.photoURL) : undefined,
    campus:
      data.campus === "cuhk" || data.campus === "cityu"
        ? data.campus
        : undefined,
    cuhkEmail: data.cuhkEmail ? String(data.cuhkEmail) : undefined,
    cuhkVerifiedAt: data.cuhkVerifiedAt
      ? typeof data.cuhkVerifiedAt === "object" &&
        data.cuhkVerifiedAt &&
        "toDate" in data.cuhkVerifiedAt
        ? (data.cuhkVerifiedAt as Timestamp).toDate().toISOString()
        : String(data.cuhkVerifiedAt)
      : undefined,
    username: data.username ? String(data.username) : undefined,
    chineseName: data.chineseName ? String(data.chineseName) : undefined,
    studentId: data.studentId ? String(data.studentId) : undefined,
    college: data.college ? String(data.college) : undefined,
    hall: data.hall ? String(data.hall) : undefined,
    roomNumber: data.roomNumber ? String(data.roomNumber) : undefined,
  };
}

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
export async function fetchAllUsers(): Promise<UserProfile[]> {
  if (!isFirebaseConfigured()) return [];
  const snap = await getDocs(collection(getDb(), USERS_COLLECTION));
  const users = snap.docs.map((d) =>
    parseUserDoc(d.id, d.data() as Record<string, unknown>),
  );
  return users.sort((a, b) =>
    a.fullName.localeCompare(b.fullName, "en", { sensitivity: "base" }),
  );
}

export async function createUserProfile(
  uid: string,
  profile: Pick<UserProfile, "fullName"> & Partial<UserProfile>,
): Promise<UserProfile> {
  const now = new Date();
  const payload = {
    uid,
    fullName: profile.fullName,
    email: profile.email?.trim().toLowerCase(),
    // Phone is runner-only. Customers and guests omit it.
    phone: profile.isRunner ? profile.phone : undefined,
    isRunner: false,
    isGuest: Boolean(profile.isGuest),
    campus: profile.campus,
    college: profile.college,
    hall: profile.hall,
    cuhkEmail: profile.cuhkEmail,
    cuhkVerifiedAt: profile.cuhkVerifiedAt,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  };
  if (isFirebaseConfigured()) {
    await setDoc(
      doc(getDb(), USERS_COLLECTION, uid),
      omitUndefined(payload as Record<string, unknown>),
    );
  }

  return {
    uid,
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    isRunner: false,
    isGuest: Boolean(profile.isGuest),
    campus: profile.campus,
    college: profile.college,
    hall: profile.hall,
    cuhkEmail: profile.cuhkEmail,
    cuhkVerifiedAt: profile.cuhkVerifiedAt,
    createdAt: now.toISOString(),
  };
}

export async function updateUserProfileDoc(
  uid: string,
  partial: Partial<UserProfile>,
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await setDoc(
    doc(getDb(), USERS_COLLECTION, uid),
    omitUndefined({
      ...partial,
      updatedAt: Timestamp.fromDate(new Date()),
    } as Record<string, unknown>),
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
