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

type AuthModule = {
  initializeAuth?: (
    firebaseApp: FirebaseApp,
    deps: { persistence: unknown },
  ) => unknown;
  getAuth?: (firebaseApp: FirebaseApp) => unknown;
  getReactNativePersistence?: (storage: typeof AsyncStorage) => unknown;
};

/**
 * `firebase/auth` resolves to the browser bundle, which has no
 * getReactNativePersistence. The RN entry persists the session in AsyncStorage.
 */
function loadAuthModule(): AuthModule {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@firebase/auth/dist/rn/index.js") as AuthModule;
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("firebase/auth") as AuthModule;
  }
}

function publishAuth(authMod: AuthModule, instance: unknown): void {
  const g = globalThis as {
    __fusionAuth?: unknown;
    __fusionAuthModule?: AuthModule;
  };
  g.__fusionAuthModule = authMod;
  if (instance) g.__fusionAuth = instance;
}

function initAuth(app: FirebaseApp): void {
  const authMod = loadAuthModule();
  const makePersistence = authMod.getReactNativePersistence;
  if (typeof makePersistence === "function" && authMod.initializeAuth) {
    try {
      const instance = authMod.initializeAuth(app, {
        persistence: makePersistence(AsyncStorage),
      });
      publishAuth(authMod, instance);
      return;
    } catch (err) {
      // Already initialized (Fast Refresh) — reuse that instance.
      console.warn("[firebase-init] initializeAuth reused", err);
    }
  } else {
    console.warn(
      "[firebase-init] React Native persistence unavailable — session will not survive restart",
    );
  }

  publishAuth(authMod, authMod.getAuth?.(app));
}

let didInit = false;

/** Runs at import time so Auth exists before App (and getAuth) load. */
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

initMobileFirebaseAuth();
