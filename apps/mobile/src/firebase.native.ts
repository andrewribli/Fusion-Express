/**
 * Initialize Firebase Auth for React Native before any getAuthClient() call.
 *
 * Uses AsyncStorage persistence when available. Falls back to getAuth() so a
 * missing RN export never bricks cold start.
 */
import {
  getAuth,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import {
  getFirebaseApp,
  isFirebaseConfigured,
  setAuthClient,
} from "@fusion-express/shared/firebase";

let ready = false;

export function ensureNativeFirebaseAuth(): void {
  if (ready) return;
  ready = true;
  if (!isFirebaseConfigured()) return;

  const app = getFirebaseApp();

  try {
    // Dynamic require keeps web/typecheck from hard-depending on the RN export.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage =
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("@react-native-async-storage/async-storage").default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { getReactNativePersistence } = require("firebase/auth") as {
      getReactNativePersistence?: (storage: unknown) => unknown;
    };

    if (typeof getReactNativePersistence === "function") {
      setAuthClient(
        initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage) as never,
        }) as Auth,
      );
      return;
    }
  } catch (err) {
    // Already initialized, or RN persistence unavailable — fall through.
    console.warn("Native Firebase Auth persistence skipped", err);
  }

  try {
    setAuthClient(getAuth(app));
  } catch (err) {
    console.warn("Firebase getAuth failed", err);
  }
}
