import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { collectionName } from "@fusion-express/shared/app-env";
import { normalizePhone, validatePhone } from "@fusion-express/shared/auth";
import { getDb, isFirebaseConfigured } from "@fusion-express/shared/firebase";
import type { MobileUserProfile } from "./auth";

/**
 * Firestore only lets isRunner flip true when runnerId points at a runners
 * doc owned by this uid, and that doc must already exist with a phone.
 */
export async function becomeRunner(
  profile: MobileUserProfile,
  phoneInput: string,
  displayName: string,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured on this build.");
  }
  const phoneErr = validatePhone(phoneInput);
  if (phoneErr) throw new Error(phoneErr);
  const phone = normalizePhone(phoneInput);
  const fullName = displayName.trim() || profile.fullName || "Runner";

  const runnerRef = await addDoc(collection(getDb(), collectionName("runners")), {
    uid: profile.uid,
    fullName,
    studentId: profile.email?.split("@")[0] || profile.uid.slice(0, 8),
    phone,
    college: profile.college ?? "",
    hall: profile.hall ?? "",
    paymentMethod: "PayMe",
    paymentId: phone,
    termsAcceptedAt: serverTimestamp(),
    active: true,
    totalEarned: 0,
    pendingPayout: 0,
    payoutHistory: [],
  });

  await setDoc(
    doc(getDb(), collectionName("users"), profile.uid),
    {
      uid: profile.uid,
      phone,
      role: "both",
      isRunner: true,
      runnerId: runnerRef.id,
      runnerPaymentMethod: "PayMe",
      runnerPaymentId: phone,
      termsAcceptedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
