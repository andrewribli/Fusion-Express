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

/** Prefer Auth; also treat Firestore profile / username maps as registered. */
export async function emailIsRegistered(email: string): Promise<boolean | null> {
  const authHit = await emailHasAuthAccount(email);
  if (authHit === true) return true;

  const profileHit = await emailHasFirestoreProfile(email);
  if (profileHit === true) return true;
  if (profileHit === false && authHit === false) return false;
  if (profileHit === false && authHit === null) {
    return emailRegisteredViaRest(email);
  }
  // profileHit null (no admin db) — fall through
  if (authHit === false) return false;
  return emailRegisteredViaRest(email);
}

async function emailHasFirestoreProfile(email: string): Promise<boolean | null> {
  const db = getAdminDb();
  if (!db) return null;
  try {
    const users = collectionName("users");
    const byEmail = await db
      .collection(users)
      .where("email", "==", email)
      .limit(1)
      .get();
    if (!byEmail.empty) return true;
    const byCuhk = await db
      .collection(users)
      .where("cuhkEmail", "==", email)
      .limit(1)
      .get();
    if (!byCuhk.empty) return true;

    const usernames = collectionName("usernames");
    const byUsernameEmail = await db
      .collection(usernames)
      .where("email", "==", email)
      .limit(1)
      .get();
    return !byUsernameEmail.empty;
  } catch (err) {
    console.error("emailHasFirestoreProfile failed", err);
    return null;
  }
}

/**
 * Resolve the Auth uid to update for a CUHK email.
 * Handles legacy accounts where Auth email was a synthetic username address
 * but the profile / usernames map stores the real CUHK email — and prefers
 * the newest username mapping when duplicates exist.
 */
export async function resolveAuthUidForEmail(
  email: string,
): Promise<string | null> {
  const auth = getAdminAuth();
  if (auth) {
    try {
      const user = await auth.getUserByEmail(email);
      return user.uid;
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code !== "auth/user-not-found") {
        console.error("resolveAuthUidForEmail auth lookup failed", err);
      }
    }
  }

  const db = getAdminDb();
  if (!db) return null;

  const usernames = collectionName("usernames");
  try {
    const mapped = await db
      .collection(usernames)
      .where("email", "==", email)
      .get();
    if (!mapped.empty) {
      const sorted = [...mapped.docs].sort((a, b) => {
        const at = a.createTime?.toMillis?.() ?? 0;
        const bt = b.createTime?.toMillis?.() ?? 0;
        return bt - at;
      });
      if (sorted.length > 1) {
        console.warn(
          `Multiple username maps for ${email}; using newest (${sorted[0].id})`,
          sorted.map((d) => d.id),
        );
      }
      const uid = String(sorted[0].data().uid ?? "");
      if (uid) return uid;
    }
  } catch (err) {
    console.error("resolveAuthUidForEmail usernames query failed", err);
  }

  const users = collectionName("users");
  try {
    for (const field of ["email", "cuhkEmail"] as const) {
      const snap = await db
        .collection(users)
        .where(field, "==", email)
        .limit(5)
        .get();
      if (snap.empty) continue;
      const sorted = [...snap.docs].sort((a, b) => {
        const at = a.updateTime?.toMillis?.() ?? 0;
        const bt = b.updateTime?.toMillis?.() ?? 0;
        return bt - at;
      });
      return sorted[0].id;
    }
  } catch (err) {
    console.error("resolveAuthUidForEmail users query failed", err);
  }

  return null;
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
  const uid = await resolveAuthUidForEmail(email);
  if (!uid) {
    throw new Error("No account found with this email.");
  }
  await auth.updateUser(uid, { password: newPassword });
}

/** Verify a browser ID token belongs to an /admins/{uid} document. */
export async function verifyAdminIdToken(
  idToken: string | null | undefined,
): Promise<{ uid: string } | null> {
  if (!idToken) return null;
  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) return null;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    const adminSnap = await db.collection("admins").doc(decoded.uid).get();
    if (!adminSnap.exists) return null;
    return { uid: decoded.uid };
  } catch (err) {
    console.error("verifyAdminIdToken failed", err);
    return null;
  }
}

/**
 * Permanently remove an account: Auth user, users/{uid}, and any username
 * maps pointing at that uid (and exact username doc when provided).
 */
export async function deleteUserAccount(opts: {
  uid: string;
  username?: string;
}): Promise<{ deletedAuth: boolean; deletedProfile: boolean; deletedUsernames: string[] }> {
  const auth = getAdminAuth();
  const db = getAdminDb();
  if (!auth || !db) {
    throw new Error("Admin delete is not configured on the server.");
  }

  const uid = opts.uid.trim();
  if (!uid) throw new Error("Missing uid");

  let deletedAuth = false;
  try {
    await auth.deleteUser(uid);
    deletedAuth = true;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code !== "auth/user-not-found") throw err;
  }

  const usersCol = collectionName("users");
  const profileRef = db.collection(usersCol).doc(uid);
  const profileSnap = await profileRef.get();
  let deletedProfile = false;
  if (profileSnap.exists) {
    await profileRef.delete();
    deletedProfile = true;
  }

  const usernamesCol = collectionName("usernames");
  const deletedUsernames: string[] = [];
  const username = opts.username?.trim().toLowerCase();
  if (username) {
    const ref = db.collection(usernamesCol).doc(username);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.delete();
      deletedUsernames.push(username);
    }
  }

  // Clean any other username maps that still point at this uid.
  const mapped = await db.collection(usernamesCol).where("uid", "==", uid).get();
  for (const doc of mapped.docs) {
    if (deletedUsernames.includes(doc.id)) continue;
    await doc.ref.delete();
    deletedUsernames.push(doc.id);
  }

  return { deletedAuth, deletedProfile, deletedUsernames };
}
