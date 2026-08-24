import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getAuthClient, isFirebaseConfigured } from "@/lib/firebase";

const EMAIL_DOMAIN = "fusion-express.app";

/** Map username → Firebase email (Email/Password auth requires an email). */
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

export function validatePassword(password: string): string | null {
  if (password.length < 6) return "Password must be at least 6 characters";
  return null;
}

export async function signUpWithUsername(
  username: string,
  password: string,
): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured");
  }
  const email = usernameToEmail(username);
  const cred = await createUserWithEmailAndPassword(
    getAuthClient(),
    email,
    password,
  );
  return cred.user;
}

export async function signInWithUsername(
  username: string,
  password: string,
): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured");
  }
  const email = usernameToEmail(username);
  const cred = await signInWithEmailAndPassword(
    getAuthClient(),
    email,
    password,
  );
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await firebaseSignOut(getAuthClient());
}
