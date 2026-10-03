import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  initializeAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

function readEnv(value: string | undefined): string | undefined {
  return value || undefined;
}

const firebaseConfig = {
  apiKey: readEnv(
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  ),
  authDomain: readEnv(
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ??
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  ),
  projectId: readEnv(
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ??
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  ),
  storageBucket: readEnv(
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ??
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  ),
  messagingSenderId: readEnv(
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  ),
  appId: readEnv(
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ??
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  ),
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
/** True when this module created Auth with `browserLocalPersistence`. */
let authCreatedWithLocalPersistence = false;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* or EXPO_PUBLIC_FIREBASE_* env vars.",
    );
  }
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return app;
}

function isBrowserDocument(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * One Auth instance for the whole app. `browserLocalPersistence` is registered
 * here, before any `onAuthStateChanged` listener, so a refresh restores the
 * same account instead of starting from an empty in-memory session.
 * Do not use `browserSessionPersistence` — that dies when the tab closes.
 */
export function getAuthClient(): Auth {
  if (!auth) {
    const firebaseApp = getFirebaseApp();
    if (isBrowserDocument()) {
      try {
        auth = initializeAuth(firebaseApp, {
          persistence: browserLocalPersistence,
        });
        authCreatedWithLocalPersistence = true;
      } catch (err) {
        const code =
          err && typeof err === "object" && "code" in err
            ? String((err as { code: unknown }).code)
            : "";
        // Another caller already initialized this app's Auth.
        if (code !== "auth/already-initialized") throw err;
        auth = getAuth(firebaseApp);
      }
    } else {
      auth = getAuth(firebaseApp);
    }
  }
  return auth;
}

/**
 * Await this before `onAuthStateChanged`. `initializeAuth` already set local
 * persistence; the fallback path (Auth created earlier) still needs
 * `setPersistence` so a refresh does not use an in-memory or session user.
 */
export function ensureBrowserLocalPersistence(): Promise<void> {
  if (!isBrowserDocument()) return Promise.resolve();
  const client = getAuthClient();
  if (authCreatedWithLocalPersistence) return Promise.resolve();
  return setPersistence(client, browserLocalPersistence);
}

export function getDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
  }
  return storage;
}
