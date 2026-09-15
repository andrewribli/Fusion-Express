import "server-only";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { collectionName } from "@/lib/constants";

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      return JSON.parse(raw) as ServiceAccount;
    } catch (err) {
      console.error("FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON", err);
    }
  }

  // Prefer env JSON on Vercel. Local file path is for scripts only — avoid
  // dynamic fs tracing of the whole project in the Next server bundle.
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return null;
  }

  const path =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS ??
    "./firebase-service-account.json";
  try {
    const absolute = resolve(/*turbopackIgnore: true*/ process.cwd(), path);
    if (!existsSync(/*turbopackIgnore: true*/ absolute)) return null;
    return JSON.parse(
      readFileSync(/*turbopackIgnore: true*/ absolute, "utf8"),
    ) as ServiceAccount;
  } catch (err) {
    console.error("Could not read Firebase service account file", err);
    return null;
  }
}

function getAdminApp(): App | null {
  const existing = getApps()[0];
  if (existing) return existing;
  const account = loadServiceAccount();
  if (!account) return null;
  return initializeApp({ credential: cert(account) });
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export function getAdminDb(): Firestore | null {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export async function emailHasAuthAccount(email: string): Promise<boolean | null> {
  const auth = getAdminAuth();
  if (!auth) return null;
  try {
    await auth.getUserByEmail(email);
    return true;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code === "auth/user-not-found") return false;
    console.error("emailHasAuthAccount failed", err);
    return null;
  }
}

async function emailRegisteredViaRest(email: string): Promise<boolean | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: email,
          continueUri: process.env.NEXT_PUBLIC_APP_ORIGIN ?? "https://gracerun.fit",
        }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { registered?: boolean };
    return Boolean(data.registered);
  } catch (err) {
    console.error("emailRegisteredViaRest failed", err);
    return null;
  }
}

/** Prefer Auth; fall back to Firestore /users, then Identity Toolkit REST. */
export async function emailIsRegistered(email: string): Promise<boolean | null> {
  const authHit = await emailHasAuthAccount(email);
  if (authHit !== null) return authHit;

  const db = getAdminDb();
  if (db) {
    const snap = await db
      .collection(collectionName("users"))
      .where("email", "==", email)
      .limit(1)
      .get();
    if (!snap.empty) return true;
    const cuhk = await db
      .collection(collectionName("users"))
      .where("cuhkEmail", "==", email)
      .limit(1)
      .get();
    if (!cuhk.empty) return true;
  }

  return emailRegisteredViaRest(email);
}

export type AlertRecipient = {
  email: string;
  isRunner: boolean;
};

export async function listUserAlertRecipients(): Promise<AlertRecipient[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db.collection(collectionName("users")).get();
  const out: AlertRecipient[] = [];
  const seen = new Set<string>();
  for (const doc of snap.docs) {
    const data = doc.data();
    const email = String(data.email ?? data.cuhkEmail ?? "")
      .trim()
      .toLowerCase();
    if (!email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    out.push({
      email,
      isRunner: Boolean(data.isRunner) || Boolean(data.runnerId),
    });
  }
  return out;
}

export async function updateAuthPassword(
  email: string,
  newPassword: string,
): Promise<void> {
  const auth = getAdminAuth();
  if (!auth) {
    throw new Error("Password reset is not configured on the server.");
  }
  const user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, { password: newPassword });
}
