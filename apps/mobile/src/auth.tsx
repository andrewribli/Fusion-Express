import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  ensureGuestSession,
  signInWithEmail,
  signOutUser,
  signUpWithEmail,
} from "@fusion-express/shared/auth";
import { collectionName } from "@fusion-express/shared/app-env";
import type { CampusId } from "@fusion-express/shared/campus";
import {
  getAuthClient,
  getDb,
  isFirebaseConfigured,
} from "@fusion-express/shared/firebase";
import { webAssetOrigin } from "@fusion-express/shared/products";
import { signInWithApple } from "./apple-auth";

/**
 * Auth persistence is not initialized here. `apps/mobile/index.ts` imports
 * `firebase-init` first, which calls `initializeAuth` with
 * `getReactNativePersistence(AsyncStorage)` from the React Native Auth bundle.
 * `firebase/auth` is the browser build and will crash iOS if imported for this.
 * `getAuthClient()` returns that persisted instance, so a closed app stays signed in.
 */

export interface MobileUserProfile {
  uid: string;
  email: string | null;
  fullName?: string;
  phone?: string;
  college?: string;
  hall?: string;
  campus?: CampusId;
  isRunner?: boolean;
  runnerId?: string;
  role?: string;
}

export type SignUpProfile = {
  fullName: string;
  email: string;
  campus: CampusId;
  cuhkEmail: string;
  cuhkVerifiedAt: string;
};

interface AuthContextValue {
  user: User | null;
  profile: MobileUserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (password: string, profile: SignUpProfile) => Promise<void>;
  signInApple: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /**
   * Ensures the device has a Firebase Auth uid for checkout.
   * Signed-in users keep their uid; guests get an anonymous session.
   */
  ensureCheckoutAuth: () => Promise<{
    uid: string;
    email: string;
    isGuest: boolean;
  }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Firebase hides which field was wrong. Show a sentence people can act on. */
export function friendlyAuthError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  const message = err instanceof Error ? err.message : "";
  const blob = `${code} ${message}`.toLowerCase();
  if (blob.includes("user-not-found")) {
    return "This account does not exist";
  }
  if (blob.includes("email-already-in-use") || blob.includes("already exists")) {
    return "Account already exists";
  }
  if (
    blob.includes("invalid-credential") ||
    blob.includes("wrong-password") ||
    blob.includes("invalid-email")
  ) {
    return "Incorrect email or password. Please try again.";
  }
  if (blob.includes("too-many-requests")) {
    return "Too many failed attempts. Try again later.";
  }
  if (blob.includes("network-request-failed")) {
    return "Network error. Check your connection and try again.";
  }
  return message || "Sign in failed";
}

async function emailRegistered(email: string): Promise<boolean | null> {
  const apiKey =
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: email.trim().toLowerCase(),
          continueUri: webAssetOrigin(),
        }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { registered?: boolean };
    return Boolean(data.registered);
  } catch {
    return null;
  }
}

/** Shared guest-auth helpers expect web Storage; Expo has neither by default. */
function ensureGuestPasswordStorage(): void {
  const g = globalThis as typeof globalThis & {
    window?: typeof globalThis & {
      localStorage?: Storage;
      sessionStorage?: Storage;
    };
    localStorage?: Storage;
    sessionStorage?: Storage;
  };

  if (!g.window) {
    g.window = g as typeof g.window;
  }

  const hasStorage =
    typeof g.window.localStorage?.getItem === "function" &&
    typeof g.window.sessionStorage?.getItem === "function";
  if (hasStorage) return;

  const mem = new Map<string, string>();
  const storage = {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mem.set(key, String(value));
    },
    removeItem: (key: string) => {
      mem.delete(key);
    },
    clear: () => mem.clear(),
    key: (_index: number) => null as string | null,
    get length() {
      return mem.size;
    },
  } as Storage;

  g.localStorage = storage;
  g.sessionStorage = storage;
  g.window.localStorage = storage;
  g.window.sessionStorage = storage;
}

async function loadProfile(uid: string, email: string | null): Promise<MobileUserProfile> {
  const base: MobileUserProfile = { uid, email };
  if (!isFirebaseConfigured()) return base;
  try {
    const snap = await getDoc(doc(getDb(), collectionName("users"), uid));
    if (!snap.exists()) return base;
    const data = snap.data() as Record<string, unknown>;
    return {
      ...base,
      fullName: data.fullName ? String(data.fullName) : undefined,
      phone: data.phone ? String(data.phone) : undefined,
      college: data.college ? String(data.college) : undefined,
      hall: data.hall ? String(data.hall) : undefined,
      campus:
        data.campus === "cityu" || data.campus === "cuhk"
          ? data.campus
          : undefined,
      isRunner: data.isRunner === true,
      runnerId: data.runnerId ? String(data.runnerId) : undefined,
      role: data.role ? String(data.role) : undefined,
    };
  } catch {
    return base;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MobileUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      if (!isFirebaseConfigured()) {
        setProfile(null);
        return;
      }
      const current = getAuthClient().currentUser;
      if (!current) {
        setProfile(null);
        return;
      }
      setProfile(await loadProfile(current.uid, current.email));
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    ensureGuestPasswordStorage();
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    let unsub: (() => void) | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const authMod =
        (globalThis as { __fusionAuthModule?: typeof import("firebase/auth") })
          .__fusionAuthModule ??
        (require("firebase/auth") as typeof import("firebase/auth"));
      const { onAuthStateChanged } = authMod;
      unsub = onAuthStateChanged(getAuthClient(), (next) => {
        setUser(next);
        if (!next) {
          setProfile(null);
          setLoading(false);
          return;
        }
        void loadProfile(next.uid, next.email)
          .then((p) => {
            setProfile(p);
            setLoading(false);
          })
          .catch(() => {
            setProfile(null);
            setLoading(false);
          });
      });
    } catch (err) {
      console.warn("[auth] onAuthStateChanged failed", err);
      setLoading(false);
    }
    return () => {
      try {
        unsub?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    try {
      await signInWithEmail(normalized, password);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: unknown }).code)
          : "";
      const blob = `${code} ${err instanceof Error ? err.message : ""}`.toLowerCase();
      if (
        blob.includes("user-not-found") ||
        blob.includes("invalid-credential") ||
        blob.includes("wrong-password")
      ) {
        const exists = await emailRegistered(normalized);
        if (exists === false) {
          throw new Error("This account does not exist");
        }
      }
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const signUp = useCallback(
    async (password: string, profileInput: SignUpProfile) => {
      try {
        const user = await signUpWithEmail(profileInput.email, password);
        await setDoc(
          doc(getDb(), collectionName("users"), user.uid),
          {
            uid: user.uid,
            fullName: profileInput.fullName,
            email: profileInput.email.trim().toLowerCase(),
            campus: profileInput.campus,
            cuhkEmail: profileInput.cuhkEmail.trim().toLowerCase(),
            cuhkVerifiedAt: profileInput.cuhkVerifiedAt,
            isGuest: false,
            isRunner: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
        const next = await loadProfile(user.uid, user.email);
        setUser(user);
        setProfile(next);
      } catch (err) {
        throw new Error(friendlyAuthError(err));
      }
    },
    [],
  );

  const signInApple = useCallback(async () => {
    await signInWithApple();
  }, []);

  const signOut = useCallback(async () => {
    await signOutUser();
    setProfile(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase is not configured on this build.");
    }
    const current = getAuthClient().currentUser;
    if (!current) throw new Error("Sign in again to delete your account.");
    const token = await current.getIdToken();
    const res = await fetch(`${webAssetOrigin()}/api/account/delete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new Error(body.error || `Could not delete account (${res.status}).`);
    }
    try {
      await signOutUser();
    } catch {
      /* Auth user may already be gone */
    }
    setUser(null);
    setProfile(null);
  }, []);

  const ensureCheckoutAuth = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase is not configured on this build.");
    }
    const current = getAuthClient().currentUser;
    if (current && !current.isAnonymous) {
      return {
        uid: current.uid,
        email: current.email ?? "",
        isGuest: false,
      };
    }
    const guest = await ensureGuestSession();
    return {
      uid: guest.uid,
      email: guest.email ?? "",
      isGuest: true,
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      refreshProfile,
      signIn,
      signUp,
      signInApple,
      signOut,
      deleteAccount,
      ensureCheckoutAuth,
    }),
    [
      user,
      profile,
      loading,
      refreshProfile,
      signIn,
      signUp,
      signInApple,
      signOut,
      deleteAccount,
      ensureCheckoutAuth,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
