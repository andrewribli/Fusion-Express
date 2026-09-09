import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getAuthClient, getDb, isFirebaseConfigured } from "./firebase";
import { collectionName } from "./app-env";
import { validateCuhkStudentEmail } from "./cuhk-email";

const USERNAMES_COLLECTION = collectionName("usernames");

const EMAIL_DOMAIN = "fusion-express.app";

export function usernameToEmail(username: string): string {
  const normalized = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  if (!normalized) throw new Error("Invalid username");
  return `${normalized}@${EMAIL_DOMAIN}`;
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
  return validateCuhkStudentEmail(email);
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
      // fall through to legacy username email
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
  const cuhkErr = validateCuhkStudentEmail(email);
  if (cuhkErr) throw new Error(cuhkErr);
  const cred = await createUserWithEmailAndPassword(
    getAuthClient(),
    email.trim().toLowerCase(),
    password,
  );
  return cred.user;
}

/** @deprecated use signUpWithEmail */
export async function signUpWithUsername(
  username: string,
  password: string,
): Promise<User> {
  return signUpWithEmail(usernameToEmail(username), password);
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
  return signInWithEmail(await resolveSignInEmail(username), password);
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured");
  }
  // Skip continueUrl — unlisted origins (including Vercel hosts not yet in the
  // live Auth allowlist) make Firebase refuse the reset for real accounts.
  await sendPasswordResetEmail(
    getAuthClient(),
    email.trim().toLowerCase(),
  );
}

export async function signOutUser(): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await firebaseSignOut(getAuthClient());
}
