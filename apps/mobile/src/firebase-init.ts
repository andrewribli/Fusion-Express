import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";

/**
 * Must run before any getAuth() from @fusion-express/shared.
 * Do not statically import firebase/auth — the web auth bundle can throw
 * at import time on iOS and RCTFatal the process (TestFlight SIGABRT).
 */
function readEnv(value: string | undefined): string | undefined {
  return value || undefined;
}

const firebaseConfig = {
  apiKey: readEnv(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  authDomain: readEnv(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: readEnv(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: readEnv(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: readEnv(
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  ),
  appId: readEnv(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
};

function isConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
  );
}

function initAuth(app: FirebaseApp): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const authMod = require("firebase/auth") as {
    initializeAuth?: (
      firebaseApp: FirebaseApp,
      deps: { persistence: unknown },
    ) => unknown;
    getAuth?: (firebaseApp: FirebaseApp) => unknown;
    getReactNativePersistence?: (storage: typeof AsyncStorage) => unknown;
  };

  const makePersistence = authMod.getReactNativePersistence;
  if (typeof makePersistence === "function" && authMod.initializeAuth) {
    try {
      authMod.initializeAuth(app, {
        persistence: makePersistence(AsyncStorage),
      });
      return;
    } catch {
      // Already initialized (Fast Refresh).
    }
  }

  authMod.getAuth?.(app);
}

let didInit = false;

export function initMobileFirebaseAuth(): void {
  if (didInit) return;
  didInit = true;

  if (!isConfigured()) {
    console.warn("[firebase-init] EXPO_PUBLIC_FIREBASE_* missing");
    return;
  }

  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    initAuth(app);
  } catch (err) {
    console.warn("[firebase-init] Auth init failed", err);
  }
}
