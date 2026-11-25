import { doc, getDoc } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@fusion-express/shared/firebase";

/**
 * Admin rights are a document in /admins keyed by auth uid — same check as
 * web `isAdminUid`. Never trust a self-writable field on `/users/{uid}`.
 */
export async function isAdminUid(uid?: string | null): Promise<boolean> {
  if (!uid || !isFirebaseConfigured()) return false;
  try {
    const snap = await getDoc(doc(getDb(), "admins", uid));
    return snap.exists();
  } catch {
    return false;
  }
}
