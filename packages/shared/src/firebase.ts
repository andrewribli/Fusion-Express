import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

function readEnv(value: string | undefined): string | undefined {
  return value || undefined;
}

/**
 * Public Firebase web-app config (safe to ship in clients).
 * Env vars override these so staging / alternate projects still work.
 * Fallbacks keep Expo TestFlight builds alive when EAS env injection is missing.
 */
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCjSHkFwdPE9FOgREpo9unFZ5ZStpyotks",
  authDomain: "fusion-express-6a438.firebaseapp.com",
  projectId: "fusion-express-6a438",
  storageBucket: "fusion-express-6a438.firebasestorage.app",
  messagingSenderId: "994081943502",
  appId: "1:994081943502:web:3f538ccff0c4dc212f459f",
};

const firebaseConfig = {
  apiKey: readEnv(
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
      DEFAULT_FIREBASE_CONFIG.apiKey,
  ),
  authDomain: readEnv(
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ??
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
      DEFAULT_FIREBASE_CONFIG.authDomain,
  ),
  projectId: readEnv(
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ??
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
      DEFAULT_FIREBASE_CONFIG.projectId,
  ),
  storageBucket: readEnv(
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ??
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
      DEFAULT_FIREBASE_CONFIG.storageBucket,
  ),
  messagingSenderId: readEnv(
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
      DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  ),
  appId: readEnv(
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ??
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
      DEFAULT_FIREBASE_CONFIG.appId,
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

/**
 * Allow React Native to install Auth with AsyncStorage persistence
 * before the first getAuthClient() call.
 */
export function setAuthClient(instance: Auth): void {
  auth = instance;
}

export function getAuthClient(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
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
