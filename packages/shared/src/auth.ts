import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getAuthClient, getDb, isFirebaseConfigured } from "./firebase";
import { collectionName } from "./app-env";
import { validateAnyCampusEmail } from "./campus";

const USERNAMES_COLLECTION = collectionName("usernames");
const PHONES_COLLECTION = collectionName("phones");

const EMAIL_DOMAIN = "fusion-express.app";
const GUEST_TEMP_PASSWORD_PREFIX = "gracerun_guest_pw_";

export function usernameToEmail(username: string): string {
  const normalized = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  if (!normalized) throw new Error("Invalid username");
  return `${normalized}@${EMAIL_DOMAIN}`;
}

/** Digits-only HK-friendly phone key used for Auth + Firestore lookups. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function validatePhone(phone: string): string | null {
  const digits = normalizePhone(phone);
  if (digits.length < 8) return "Enter a valid phone number";
  if (digits.length > 15) return "Phone number is too long";
  return null;
}

/** Placeholder Auth email so guests can use Email/Password without signing up. */
export function phoneToEmail(phone: string): string {
  const digits = normalizePhone(phone);
  if (!digits) throw new Error("Invalid phone number");
  return `phone_${digits}@${EMAIL_DOMAIN}`;
}

export function isGuestSyntheticEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return /^phone_\d+@fusion-express\.app$/i.test(email.trim());
}

function guestTempPasswordKey(phone: string): string {
  return `${GUEST_TEMP_PASSWORD_PREFIX}${normalizePhone(phone)}`;
}

export function storeGuestTempPassword(phone: string, password: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(guestTempPasswordKey(phone), password);
    window.localStorage.setItem(guestTempPasswordKey(phone), password);
  } catch {
    // ignore storage errors
  }
}

export function getGuestTempPassword(phone: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      window.sessionStorage.getItem(guestTempPasswordKey(phone)) ??
      window.localStorage.getItem(guestTempPasswordKey(phone))
    );
  } catch {
    return null;
  }
}

export function clearGuestTempPassword(phone: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(guestTempPasswordKey(phone));
    window.localStorage.removeItem(guestTempPasswordKey(phone));
  } catch {
    // ignore
  }
}

function randomGuestPassword(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return `Gr!${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Guest checkout without a phone. Reuses the current Auth user, otherwise
 * signs in anonymously. If anonymous auth is disabled, falls back to a
 * one-off synthetic email so the order can still be written.
 */
export async function ensureGuestSession(): Promise<{
  uid: string;
  email?: string;
}> {
  if (!isFirebaseConfigured()) {
    return { uid: `guest_${Date.now()}` };
  }

  const current = getAuthClient().currentUser;
  if (current) {
    return { uid: current.uid, email: current.email ?? undefined };
  }

  try {
    const cred = await signInAnonymously(getAuthClient());
    return { uid: cred.user.uid, email: cred.user.email ?? undefined };
  } catch {
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const email = `guest_${id}@${EMAIL_DOMAIN}`;
    const password = randomGuestPassword();
    const user = await signUpWithSyntheticEmail(email, password);
    storeGuestTempPassword(id, password);
    return { uid: user.uid, email };
  }
}

export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (trimmed.length < 3) return "Username must be at least 3 characters";
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return "Username can only contain letters, numbers, dots, dashes";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  return validateAnyCampusEmail(email);
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return "Password must be at least 6 characters";
  return null;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export async function assertUsernameAvailable(username: string): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const snap = await getDoc(
    doc(getDb(), USERNAMES_COLLECTION, normalizeUsername(username)),
  );
  if (snap.exists()) {
    throw new Error("Username already taken");
  }
}

export async function saveUsernameLogin(
  username: string,
  email: string,
  uid: string,
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await setDoc(doc(getDb(), USERNAMES_COLLECTION, normalizeUsername(username)), {
    username: username.trim(),
    email: email.trim().toLowerCase(),
    uid,
  });
}

export async function savePhoneLogin(
  phone: string,
  email: string,
  uid: string,
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const digits = normalizePhone(phone);
  await setDoc(doc(getDb(), PHONES_COLLECTION, digits), {
    phone: digits,
    email: email.trim().toLowerCase(),
    uid,
  });
}

export async function resolvePhoneLogin(
  phone: string,
): Promise<{ email: string; uid: string } | null> {
  if (!isFirebaseConfigured()) return null;
  const digits = normalizePhone(phone);
  if (!digits) return null;
  try {
    const snap = await getDoc(doc(getDb(), PHONES_COLLECTION, digits));
    if (!snap.exists()) return null;
    const data = snap.data();
    const email = typeof data.email === "string" ? data.email : "";
    const uid = typeof data.uid === "string" ? data.uid : "";
    if (!email || !uid) return null;
    return { email: email.toLowerCase(), uid };
  } catch {
    return null;
  }
}

/**
 * Create an Email/Password account for a synthetic @fusion-express.app address
 * (guest phone accounts / legacy usernames). Skips the CUHK email gate.
 */
export async function signUpWithSyntheticEmail(
  email: string,
  password: string,
): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured");
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith(`@${EMAIL_DOMAIN}`)) {
    throw new Error("Invalid account email");
  }
  const cred = await createUserWithEmailAndPassword(
    getAuthClient(),
    normalized,
    password,
  );
  return cred.user;
}

/**
 * Ensure a Firebase (or demo) guest account exists for this phone and return
 * Auth credentials info. Caller still writes the Firestore users/{uid} profile.
 */
export async function ensureGuestAuthForPhone(phone: string): Promise<{
  uid: string;
  email: string;
  created: boolean;
  tempPassword: string | null;
}> {
  const phoneErr = validatePhone(phone);
  if (phoneErr) throw new Error(phoneErr);
  const digits = normalizePhone(phone);
  const email = phoneToEmail(digits);

  if (!isFirebaseConfigured()) {
    return {
      uid: `guest_${digits}`,
      email,
      created: true,
      tempPassword: null,
    };
  }

  const existing = await resolvePhoneLogin(digits);
  const storedPw = getGuestTempPassword(digits);

  if (existing) {
    const current = getAuthClient().currentUser;
    if (current?.uid === existing.uid) {
      return {
        uid: existing.uid,
        email: existing.email,
        created: false,
        tempPassword: storedPw,
      };
    }
    if (storedPw) {
      await signInWithEmailAndPassword(getAuthClient(), existing.email, storedPw);
      return {
        uid: existing.uid,
        email: existing.email,
        created: false,
        tempPassword: storedPw,
      };
    }
    throw new Error(
      "An account already exists for this phone. Sign in with the password you set, or reset it from the login page.",
    );
  }

  const password = randomGuestPassword();
  try {
    const user = await signUpWithSyntheticEmail(email, password);
    storeGuestTempPassword(digits, password);
    await savePhoneLogin(digits, email, user.uid);
    await saveUsernameLogin(`phone_${digits}`, email, user.uid);
    return {
      uid: user.uid,
      email,
      created: true,
      tempPassword: password,
    };
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code.includes("email-already-in-use")) {
      throw new Error(
        "An account already exists for this phone. Sign in from the login page.",
      );
    }
    throw err;
  }
}

/** First-time password set for guests (uses the device-stored temp password). */
export async function setPasswordFromGuestTemp(
  phone: string,
  newPassword: string,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured");
  }
  const newErr = validatePassword(newPassword);
  if (newErr) throw new Error(newErr);
  const user = getAuthClient().currentUser;
  if (!user?.email) {
    throw new Error("Please stay signed in to set a password");
  }
  const temp = getGuestTempPassword(phone);
  if (!temp) {
    throw new Error(
      "Open this on the same device you ordered from, or use Forgot password on the login page.",
    );
  }
  const credential = EmailAuthProvider.credential(user.email, temp);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
  clearGuestTempPassword(phone);
}

async function resolveSignInEmail(identifier: string): Promise<string> {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  if (isFirebaseConfigured()) {
    try {
      const snap = await getDoc(
        doc(getDb(), USERNAMES_COLLECTION, normalizeUsername(trimmed)),
      );
      const mapped = snap.exists() ? snap.data().email : undefined;
      if (typeof mapped === "string" && mapped.includes("@")) {
        return mapped.toLowerCase();
      }
    } catch {
      // fall through
    }
    // Guest accounts: allow signing in with the phone number used at checkout.
    const digits = normalizePhone(trimmed);
    if (digits.length >= 8) {
      try {
        const phoneSnap = await getDoc(doc(getDb(), PHONES_COLLECTION, digits));
        const email = phoneSnap.exists() ? phoneSnap.data().email : undefined;
        if (typeof email === "string" && email.includes("@")) {
          return email.toLowerCase();
        }
      } catch {
        // fall through to synthetic email
      }
      return phoneToEmail(digits);
    }
  }
  return usernameToEmail(trimmed);
}

export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured");
  }
  const emailErr = validateAnyCampusEmail(email);
  if (emailErr) throw new Error(emailErr);
  const cred = await createUserWithEmailAndPassword(
    getAuthClient(),
    email.trim().toLowerCase(),
    password,
  );
  return cred.user;
}

/** @deprecated use signUpWithEmail for CUHK emails, or signUpWithSyntheticEmail */
export async function signUpWithUsername(
  username: string,
  password: string,
): Promise<User> {
  return signUpWithSyntheticEmail(usernameToEmail(username), password);
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured");
  }
  const cred = await signInWithEmailAndPassword(
    getAuthClient(),
    email.trim().toLowerCase(),
    password,
  );
  return cred.user;
}

export async function signInWithUsername(
  username: string,
  password: string,
): Promise<User> {
  const trimmed = username.trim();
  if (trimmed.includes("@")) {
    return signInWithEmail(trimmed.toLowerCase(), password);
  }

  const resolved = await resolveSignInEmail(trimmed);
  try {
    return await signInWithEmail(resolved, password);
  } catch (primaryErr) {
    // Legacy accounts may still authenticate as username@fusion-express.app
    // even though the usernames map stores their CUHK email.
    const legacy = usernameToEmail(trimmed);
    if (legacy !== resolved.toLowerCase()) {
      try {
        return await signInWithEmail(legacy, password);
      } catch {
        // Prefer the original error from the mapped email attempt.
      }
    }
    throw primaryErr;
  }
}

export async function sendPasswordReset(identifier: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured");
  }
  const resolved = identifier.includes("@")
    ? identifier.trim().toLowerCase()
    : await resolveSignInEmail(identifier);
  const emailErr = validateAnyCampusEmail(resolved);
  if (emailErr && !resolved.endsWith(`@${EMAIL_DOMAIN}`)) {
    throw new Error(emailErr);
  }
  // Skip continueUrl — unlisted origins (including Vercel hosts not yet in the
  // live Auth allowlist) make Firebase refuse the reset for real accounts.
  await sendPasswordResetEmail(getAuthClient(), resolved);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured");
  }
  const user = getAuthClient().currentUser;
  if (!user?.email) {
    throw new Error("Please sign in again before changing your password");
  }
  const newErr = validatePassword(newPassword);
  if (newErr) throw new Error(newErr);
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function signOutUser(): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await firebaseSignOut(getAuthClient());
}
