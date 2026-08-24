import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

function env(name: string): string | undefined {
  const fromProcess =
    typeof process !== "undefined" ? process.env[name] : undefined;
  return fromProcess || undefined;
}

/** Same Firebase project for Next (NEXT_PUBLIC_*) and Expo (EXPO_PUBLIC_*). */
function firebaseEnv(suffix: string): string | undefined {
  return (
    env(`EXPO_PUBLIC_FIREBASE_${suffix}`) ??
    env(`NEXT_PUBLIC_FIREBASE_${suffix}`)
  );
}

const firebaseConfig = {
  apiKey: firebaseEnv("API_KEY"),
  authDomain: firebaseEnv("AUTH_DOMAIN"),
  projectId: firebaseEnv("PROJECT_ID"),
  storageBucket: firebaseEnv("STORAGE_BUCKET"),
  messagingSenderId: firebaseEnv("MESSAGING_SENDER_ID"),
  appId: firebaseEnv("APP_ID"),
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
