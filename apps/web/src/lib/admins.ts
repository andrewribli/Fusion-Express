import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { isAdminAllowlistEmail } from "@/lib/admin-emails";
import { doc, getDoc } from "firebase/firestore";

/**
 * Admin rights are a document in /admins keyed by auth uid. They deliberately
 * do not live on the user's own profile, which the user can write themselves.
 * Grant one from the Firebase console or the Admin SDK.
 *
 * Access also requires the email to be on the hard-coded ops allowlist.
 */
export async function isAdminUid(
  uid?: string,
  email?: string | null,
): Promise<boolean> {
  if (!uid || !isFirebaseConfigured()) return false;
  if (email != null && !isAdminAllowlistEmail(email)) return false;
  try {
    const snap = await getDoc(doc(getDb(), "admins", uid));
    if (!snap.exists()) return false;
    // If the caller did not pass an email, still require the allowlist when we
    // can read it from the signed-in profile later; uid doc alone is not enough
    // for routes that know the email.
    if (email === undefined) return true;
    return isAdminAllowlistEmail(email);
  } catch {
    return false;
  }
}

export async function isAdminUser(opts: {
  uid?: string;
  email?: string | null;
}): Promise<boolean> {
  if (!isAdminAllowlistEmail(opts.email)) return false;
  return isAdminUid(opts.uid, opts.email);
}
