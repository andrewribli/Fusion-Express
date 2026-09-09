import type { UserProfile } from "@/context/UserContext";
import { omitUndefined } from "@/lib/omit-undefined";
import { collectionName } from "@/lib/constants";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection, setDoc, Timestamp, deleteField } from "firebase/firestore";

const USERS_COLLECTION = collectionName("users");

export type UserProfileDoc = UserProfile & {
  username: string;
  createdAt: Date;
  updatedAt: Date;
};

function parseUserDoc(uid: string, data: Record<string, unknown>): UserProfile {
  return {
    uid,
    username: String(data.username ?? ""),
    email: data.email ? String(data.email) : undefined,
    fullName: String(data.fullName ?? ""),
    chineseName: String(data.chineseName ?? ""),
    studentId: String(data.studentId ?? ""),
    college: String(data.college ?? ""),
    hall: String(data.hall ?? ""),
    roomNumber: data.roomNumber ? String(data.roomNumber) : undefined,
    phone: data.phone ? String(data.phone) : undefined,
    isRunner: Boolean(data.isRunner),
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
    cuhkEmail: data.cuhkEmail ? String(data.cuhkEmail) : undefined,
    cuhkVerifiedAt: data.cuhkVerifiedAt
      ? typeof data.cuhkVerifiedAt === "object" &&
        data.cuhkVerifiedAt &&
        "toDate" in data.cuhkVerifiedAt
        ? (data.cuhkVerifiedAt as Timestamp).toDate().toISOString()
        : String(data.cuhkVerifiedAt)
      : undefined,
  };
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  if (!isFirebaseConfigured()) return null;
  try {
    const snap = await getDoc(doc(getDb(), USERS_COLLECTION, uid));
    if (!snap.exists()) return null;
    return parseUserDoc(uid, snap.data() as Record<string, unknown>);
  } catch {
    return null;
  }
}

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
  profile: Omit<UserProfile, "uid"> & { username: string },
): Promise<UserProfile> {
  const now = new Date();
  if (isFirebaseConfigured()) {
    await setDoc(
      doc(getDb(), USERS_COLLECTION, uid),
      omitUndefined({
        ...profile,
        uid,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      } as Record<string, unknown>),
    );
  }

  return { ...profile, uid };
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
