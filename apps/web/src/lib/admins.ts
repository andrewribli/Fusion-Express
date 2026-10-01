import { isAdminEmail } from "@/lib/adminAccess";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * Admin rights: /admins/{uid} document OR email on the founder allowlist.
 * UI shortcuts use the same check; Firestore rules still require /admins
 * for privileged reads — founders should have an /admins doc in prod.
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

/** True if the signed-in user may see admin chrome / open /admin. */
export async function isAdminUser(opts: {
  uid?: string;
  email?: string | null;
}): Promise<boolean> {
  if (isAdminEmail(opts.email)) return true;
  return isAdminUid(opts.uid);
}
