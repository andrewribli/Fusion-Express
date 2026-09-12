import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * Admin rights are a document in /admins keyed by auth uid. They deliberately
 * do not live on the user's own profile, which the user can write themselves.
 * Grant one from the Firebase console or the Admin SDK.
 */
export async function isAdminUid(uid?: string): Promise<boolean> {
  if (!uid || !isFirebaseConfigured()) return false;
  try {
    const snap = await getDoc(doc(getDb(), "admins", uid));
    return snap.exists();
  } catch {
    return false;
  }
}
