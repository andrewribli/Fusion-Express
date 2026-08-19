"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { signOutUser } from "@/lib/auth";
import { getAuthClient, isFirebaseConfigured } from "@/lib/firebase";
import {
  createUserProfile,
  fetchUserProfile,
  updateUserProfileDoc,
} from "@/lib/users";

export interface UserProfile {
  uid?: string;
  username?: string;
  fullName: string;
  chineseName: string;
  studentId: string;
  college: string;
  hall: string;
  roomNumber?: string;
  phone?: string;
  isRunner?: boolean;
  runnerId?: string;
  runnerPaymentMethod?: "PayMe" | "FPS";
  runnerPaymentId?: string;
  termsAcceptedAt?: string;
}

const USER_STORAGE_KEY = "fusion_user_profile";
const TERMS_ACCEPTED_KEY = "fusion_runner_terms_accepted";

interface UserContextValue {
  user: UserProfile | null;
  isReady: boolean;
  termsAccepted: boolean;
  firebaseEnabled: boolean;
  /** @deprecated use signUp/signIn — kept for offline dev fallback */
  login: (profile: UserProfile) => void;
  signUp: (
    username: string,
    password: string,
    profile: Omit<UserProfile, "uid" | "username">,
  ) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profile: UserProfile) => void;
  acceptRunnerTerms: () => void;
  setRunnerRegistered: (
    runnerId: string,
    payment: { method: "PayMe" | "FPS"; id: string },
  ) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

function loadUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function loadTermsAccepted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(TERMS_ACCEPTED_KEY) === "true";
}

function cacheProfile(profile: UserProfile | null) {
  if (typeof window === "undefined") return;
  if (profile) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const firebaseEnabled = isFirebaseConfigured();

  useEffect(() => {
    setTermsAccepted(loadTermsAccepted());

    if (!firebaseEnabled) {
      setUser(loadUser());
      setIsReady(true);
      return;
    }

    const unsub = onAuthStateChanged(getAuthClient(), async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await fetchUserProfile(firebaseUser.uid);
        if (profile) {
          setUser(profile);
          cacheProfile(profile);
          if (profile.termsAcceptedAt) {
            localStorage.setItem(TERMS_ACCEPTED_KEY, "true");
            setTermsAccepted(true);
          }
        } else {
          const cached = loadUser();
          if (cached?.uid === firebaseUser.uid) {
            setUser(cached);
          }
        }
      } else {
        setUser(null);
        cacheProfile(null);
      }
      setIsReady(true);
    });

    return unsub;
  }, [firebaseEnabled]);

  const persist = useCallback((profile: UserProfile | null) => {
    cacheProfile(profile);
    setUser(profile);
  }, []);

  const login = useCallback(
    (profile: UserProfile) => persist(profile),
    [persist],
  );

  const signUp = useCallback(
    async (
      username: string,
      password: string,
      profile: Omit<UserProfile, "uid" | "username">,
    ) => {
      const { signUpWithUsername } = await import("@/lib/auth");
      const firebaseUser = await signUpWithUsername(username, password);
      const fullProfile = await createUserProfile(firebaseUser.uid, {
        ...profile,
        username,
      });
      persist(fullProfile);
    },
    [persist],
  );

  const signIn = useCallback(async (username: string, password: string) => {
    const { signInWithUsername } = await import("@/lib/auth");
    await signInWithUsername(username, password);
    // onAuthStateChanged will load profile
  }, []);

  const logout = useCallback(async () => {
    if (firebaseEnabled) {
      await signOutUser();
    }
    persist(null);
    localStorage.removeItem(TERMS_ACCEPTED_KEY);
    setTermsAccepted(false);
  }, [firebaseEnabled, persist]);

  const updateProfile = useCallback(
    (profile: UserProfile) => {
      persist(profile);
      if (profile.uid && firebaseEnabled) {
        void updateUserProfileDoc(profile.uid, profile);
      }
    },
    [firebaseEnabled, persist],
  );

  const acceptRunnerTerms = useCallback(() => {
    localStorage.setItem(TERMS_ACCEPTED_KEY, "true");
    setTermsAccepted(true);
  }, []);

  const setRunnerRegistered = useCallback(
    (runnerId: string, payment: { method: "PayMe" | "FPS"; id: string }) => {
      setUser((prev) => {
        if (!prev) return prev;
        const updated: UserProfile = {
          ...prev,
          isRunner: true,
          runnerId,
          runnerPaymentMethod: payment.method,
          runnerPaymentId: payment.id,
          termsAcceptedAt: new Date().toISOString(),
        };
        cacheProfile(updated);
        if (prev.uid && firebaseEnabled) {
          void updateUserProfileDoc(prev.uid, updated);
        }
        return updated;
      });
    },
    [firebaseEnabled],
  );

  const value = useMemo(
    () => ({
      user,
      isReady,
      termsAccepted,
      firebaseEnabled,
      login,
      signUp,
      signIn,
      logout,
      updateProfile,
      acceptRunnerTerms,
      setRunnerRegistered,
    }),
    [
      user,
      isReady,
      termsAccepted,
      firebaseEnabled,
      login,
      signUp,
      signIn,
      logout,
      updateProfile,
      acceptRunnerTerms,
      setRunnerRegistered,
    ],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}

/** Canonical customer/runner identity for orders & chat */
export function getUserAccountId(user: UserProfile): string {
  return user.uid ?? user.studentId;
}
