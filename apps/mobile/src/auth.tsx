import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  ensureGuestAuthForPhone,
  normalizePhone,
  signInWithEmail,
  signOutUser,
  validatePhone,
} from "@fusion-express/shared/auth";
import { collectionName } from "@fusion-express/shared/app-env";
import {
  getAuthClient,
  getDb,
  isFirebaseConfigured,
} from "@fusion-express/shared/firebase";

export interface MobileUserProfile {
  uid: string;
  email: string | null;
  fullName?: string;
  phone?: string;
  college?: string;
  hall?: string;
  isRunner?: boolean;
  runnerId?: string;
  role?: string;
}

interface AuthContextValue {
  user: User | null;
  profile: MobileUserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Ensures the device has a Firebase Auth uid for checkout.
   * Signed-in CUHK users keep their uid; guests get a phone-backed account.
   */
  ensureCheckoutAuth: (phone: string) => Promise<{
    uid: string;
    email: string;
    isGuest: boolean;
  }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

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
    const current = getAuthClient().currentUser;
    if (!current) {
      setProfile(null);
      return;
    }
    setProfile(await loadProfile(current.uid, current.email));
  }, []);

  useEffect(() => {
    ensureGuestPasswordStorage();
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(getAuthClient(), (next) => {
      setUser(next);
      if (!next) {
        setProfile(null);
        setLoading(false);
        return;
      }
      void loadProfile(next.uid, next.email).then((p) => {
        setProfile(p);
        setLoading(false);
      });
    });
    return unsub;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmail(email, password);
  }, []);

  const signOut = useCallback(async () => {
    await signOutUser();
    setProfile(null);
  }, []);

  const ensureCheckoutAuth = useCallback(
    async (phone: string) => {
      const phoneErr = validatePhone(phone);
      if (phoneErr) throw new Error(phoneErr);
      const digits = normalizePhone(phone);

      const current = getAuthClient().currentUser;
      if (current && !/^phone_\d+@fusion-express\.app$/i.test(current.email ?? "")) {
        return {
          uid: current.uid,
          email: current.email ?? "",
          isGuest: false,
        };
      }

      ensureGuestPasswordStorage();
      const guest = await ensureGuestAuthForPhone(digits);
      return {
        uid: guest.uid,
        email: guest.email,
        isGuest: true,
      };
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      refreshProfile,
      signIn,
      signOut,
      ensureCheckoutAuth,
    }),
    [
      user,
      profile,
      loading,
      refreshProfile,
      signIn,
      signOut,
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
