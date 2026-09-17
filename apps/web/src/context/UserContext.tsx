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
import { isDemoAuth } from "@/lib/constants";
import {
  clearRunnerFromProfile,
  createUserProfile,
  fetchUserProfile,
  updateUserProfileDoc,
} from "@/lib/users";
import { findRunnerForUser } from "@/lib/runners";
import {
  defaultModeForRole,
  normalizeRole,
  roleAllowsRunner,
  roleWithRunner,
  canSwitchModes as roleCanSwitchModes,
  type AppMode,
  type UserRole,
} from "@/lib/roles";

export interface UserProfile {
  uid?: string;
  email?: string;
  fullName: string;
  phone?: string;
  isRunner?: boolean;
  isGuest?: boolean;
  createdAt?: string;
  /** Which experiences this account signed up for. */
  role?: UserRole;
  runnerId?: string;
  runnerPaymentMethod?: "PayMe" | "FPS";
  runnerPaymentId?: string;
  termsAcceptedAt?: string;
  cuhkEmail?: string;
  cuhkVerifiedAt?: string;
  photoURL?: string;
  /** Legacy fields kept for old Firestore docs; not written on new signups. */
  username?: string;
  chineseName?: string;
  studentId?: string;
  college?: string;
  hall?: string;
  roomNumber?: string;
}

const USER_STORAGE_KEY = "fusion_user_profile";
const TERMS_ACCEPTED_KEY = "fusion_runner_terms_accepted";
const DEMO_PASSWORD_KEY = "fusion_demo_password";
const APP_MODE_KEY = "fusion_app_mode";

function profileStore(): Storage | null {
  if (typeof window === "undefined") return null;
  return isDemoAuth() ? sessionStorage : localStorage;
}

interface UserContextValue {
  user: UserProfile | null;
  isReady: boolean;
  termsAccepted: boolean;
  firebaseEnabled: boolean;
  /** What the account signed up for. */
  role: UserRole;
  /** Whether the runner experience is available to this account. */
  canRunnerMode: boolean;
  /** Dual-role accounts may toggle between shopping and delivering. */
  canSwitchModes: boolean;
  /** Which experience is on screen right now. */
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  /** @deprecated use signUp/signIn — kept for offline dev fallback */
  login: (profile: UserProfile) => void;
  signUp: (
    password: string,
    profile: Pick<UserProfile, "fullName" | "email"> & Partial<UserProfile>,
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  ensureGuestCheckout: (opts: {
    phone: string;
    college: string;
    hall: string;
  }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateProfile: (profile: UserProfile) => void;
  acceptRunnerTerms: () => void;
  setRunnerRegistered: (
    runnerId: string,
    payment: { method: "PayMe" | "FPS"; id: string },
  ) => void;
  bootError: string | null;
}

const UserContext = createContext<UserContextValue | null>(null);

function loadUser(): UserProfile | null {
  const store = profileStore();
  if (!store) return null;
  try {
    const raw = store.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function loadTermsAccepted(): boolean {
  const store = profileStore();
  if (!store) return false;
  return store.getItem(TERMS_ACCEPTED_KEY) === "true";
}

function loadSavedMode(): AppMode | null {
  const saved = profileStore()?.getItem(APP_MODE_KEY);
  return saved === "runner" || saved === "customer" ? saved : null;
}

function cacheProfile(profile: UserProfile | null) {
  const store = profileStore();
  if (!store) return;
  if (profile) {
    store.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
  } else {
    store.removeItem(USER_STORAGE_KEY);
  }
}

async function restoreRunnerProfile(profile: UserProfile): Promise<UserProfile> {
  const found = await findRunnerForUser({
    uid: profile.uid,
    studentId: profile.studentId,
  });
  if (found) {
    if (profile.isRunner && profile.runnerId === found.id) return profile;
    const updated: UserProfile = {
      ...profile,
      role: roleWithRunner(normalizeRole(profile.role, profile.isRunner)),
      isRunner: true,
      runnerId: found.id,
      runnerPaymentMethod: found.paymentMethod,
      runnerPaymentId: found.paymentId,
      termsAcceptedAt:
        profile.termsAcceptedAt ?? found.termsAcceptedAt.toISOString(),
    };
    if (profile.uid) {
      void updateUserProfileDoc(profile.uid, {
        role: updated.role,
        isRunner: true,
        runnerId: found.id,
        runnerPaymentMethod: found.paymentMethod,
        runnerPaymentId: found.paymentId,
        termsAcceptedAt: updated.termsAcceptedAt,
      });
    }
    return updated;
  }
  if (!profile.isRunner && !profile.runnerId) return profile;
  if (profile.uid) {
    void clearRunnerFromProfile(profile.uid);
  }
  return {
    ...profile,
    isRunner: false,
    runnerId: undefined,
    runnerPaymentMethod: undefined,
    runnerPaymentId: undefined,
  };
}

function isLiveHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

function firebaseErrorText(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : "";
  const message = err instanceof Error ? err.message : "";
  if (code.includes("unauthorized-domain") || message.includes("unauthorized-domain")) {
    const host = typeof window !== "undefined" ? window.location.hostname : "this domain";
    return `Firebase blocked Auth on ${host}. Add this host under Authentication → Settings → Authorized domains.`;
  }
  return message || code || "Firebase failed to start.";
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [savedMode, setSavedMode] = useState<AppMode | null>(null);
  const firebaseEnabled = isFirebaseConfigured();

  useEffect(() => {
    setTermsAccepted(loadTermsAccepted());
    setSavedMode(loadSavedMode());

    if (!firebaseEnabled) {
      if (isLiveHost()) {
        setBootError(
          "Firebase is not configured on this deploy. Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, and NEXT_PUBLIC_FIREBASE_APP_ID on Vercel (Production), then redeploy.",
        );
      } else {
        setUser(loadUser());
      }
      setIsReady(true);
      return;
    }

    if (isDemoAuth()) {
      setUser(loadUser());
      setIsReady(true);
      return;
    }

    let cancelled = false;
    let becameReady = false;
    const markReady = () => {
      becameReady = true;
      if (!cancelled) setIsReady(true);
    };

    const failOpen = window.setTimeout(() => {
      if (cancelled || becameReady) return;
      setBootError(
        `Firebase Auth did not finish on ${window.location.hostname}. Confirm this domain is in Firebase authorized domains, then tap Retry.`,
      );
      markReady();
    }, 5000);

    let unsub: (() => void) | undefined;
    try {
      unsub = onAuthStateChanged(
        getAuthClient(),
        (firebaseUser) => {
          window.clearTimeout(failOpen);
          if (cancelled) return;
          setBootError(null);
          markReady();

          if (!firebaseUser) {
            setUser(null);
            cacheProfile(null);
            return;
          }

          const cached = loadUser();
          if (cached?.uid === firebaseUser.uid) {
            setUser({
              ...cached,
              photoURL: firebaseUser.photoURL || cached.photoURL,
            });
          }

          void (async () => {
            try {
              const profile = await fetchUserProfile(firebaseUser.uid);
              const base =
                profile ??
                (cached?.uid === firebaseUser.uid ? cached : null);
              if (!base || cancelled) return;
              const hydrated = await restoreRunnerProfile({
                ...base,
                photoURL: firebaseUser.photoURL || base.photoURL,
              });
              if (cancelled) return;
              setUser(hydrated);
              cacheProfile(hydrated);
              if (hydrated.isRunner || hydrated.termsAcceptedAt) {
                profileStore()?.setItem(TERMS_ACCEPTED_KEY, "true");
                setTermsAccepted(true);
              }
            } catch (err) {
              console.error("Auth restore failed", err);
              setBootError(firebaseErrorText(err));
            }
          })();
        },
        (err) => {
          console.error("Auth listener failed", err);
          window.clearTimeout(failOpen);
          setBootError(firebaseErrorText(err));
          markReady();
        },
      );
    } catch (err) {
      console.error("Auth init failed", err);
      window.clearTimeout(failOpen);
      setBootError(firebaseErrorText(err));
      markReady();
    }

    return () => {
      cancelled = true;
      window.clearTimeout(failOpen);
      unsub?.();
    };
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
      password: string,
      profile: Pick<UserProfile, "fullName" | "email"> & Partial<UserProfile>,
    ) => {
      if (isDemoAuth()) {
        const demoProfile: UserProfile = {
          ...profile,
          uid: `demo_${crypto.randomUUID()}`,
          fullName: profile.fullName,
          email: profile.email,
          isGuest: false,
          isRunner: false,
          createdAt: new Date().toISOString(),
        };
        profileStore()?.setItem(DEMO_PASSWORD_KEY, password);
        persist(demoProfile);
        return;
      }
      const { signUpWithEmail, validateEmail } = await import("@/lib/auth");
      if (!profile.email) {
        throw new Error("Email is required");
      }
      const emailErr = validateEmail(profile.email);
      if (emailErr) throw new Error(emailErr);
      const firebaseUser = await signUpWithEmail(profile.email, password);
      const fullProfile = await createUserProfile(firebaseUser.uid, {
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        cuhkEmail: profile.cuhkEmail ?? profile.email,
        cuhkVerifiedAt: profile.cuhkVerifiedAt ?? new Date().toISOString(),
        isGuest: false,
        isRunner: false,
      });
      persist(fullProfile);
    },
    [persist],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (isDemoAuth()) {
        const stored = loadUser();
        const demoPassword = profileStore()?.getItem(DEMO_PASSWORD_KEY);
        const identifier = email.trim().toLowerCase();
        const matches =
          stored &&
          demoPassword === password &&
          stored.email?.toLowerCase() === identifier;
        if (!matches) {
          throw new Error(
            "No demo account in this tab. Create an account — it is not saved to the database.",
          );
        }
        persist(stored);
        return;
      }
      const { signInWithEmail } = await import("@/lib/auth");
      await signInWithEmail(email, password);
    },
    [persist],
  );

  const ensureGuestCheckout = useCallback(
    async (opts: { phone: string; college: string; hall: string }) => {
      const { ensureGuestAuthForPhone, normalizePhone, validatePhone, phoneToEmail } =
        await import("@/lib/auth");
      const phoneErr = validatePhone(opts.phone);
      if (phoneErr) throw new Error(phoneErr);
      if (!opts.college.trim() || !opts.hall.trim()) {
        throw new Error("Choose your college and hall");
      }
      const digits = normalizePhone(opts.phone);

      if (user?.phone && normalizePhone(user.phone) === digits && user.uid) {
        const updated: UserProfile = {
          ...user,
          phone: digits,
          isGuest: user.isGuest ?? true,
          role: normalizeRole(user.role, Boolean(user.isRunner)),
        };
        persist(updated);
        if (user.uid && firebaseEnabled && !isDemoAuth()) {
          void updateUserProfileDoc(user.uid, { phone: digits });
        }
        return updated;
      }

      if (isDemoAuth() || !firebaseEnabled) {
        const demoProfile: UserProfile = {
          uid: `guest_${digits}`,
          email: phoneToEmail(digits),
          fullName: "Guest",
          phone: digits,
          isGuest: true,
          isRunner: false,
          role: "customer",
          createdAt: new Date().toISOString(),
        };
        persist(demoProfile);
        return demoProfile;
      }

      const auth = await ensureGuestAuthForPhone(digits);
      const existing = await fetchUserProfile(auth.uid);
      const profile: UserProfile = existing
        ? {
            ...existing,
            phone: digits,
            isGuest: existing.isGuest ?? true,
            role: normalizeRole(existing.role, Boolean(existing.isRunner)),
          }
        : await createUserProfile(auth.uid, {
            email: auth.email,
            fullName: "Guest",
            phone: digits,
            isGuest: true,
            isRunner: false,
          });

      if (existing) {
        await updateUserProfileDoc(auth.uid, {
          phone: digits,
          isGuest: profile.isGuest,
        });
      }
      persist(profile);
      return profile;
    },
    [firebaseEnabled, persist, user],
  );

  const logout = useCallback(async () => {
    if (firebaseEnabled && !isDemoAuth()) {
      await signOutUser();
    }
    persist(null);
    profileStore()?.removeItem(TERMS_ACCEPTED_KEY);
    profileStore()?.removeItem(DEMO_PASSWORD_KEY);
    profileStore()?.removeItem(APP_MODE_KEY);
    setTermsAccepted(false);
    setSavedMode(null);
  }, [firebaseEnabled, persist]);

  const updateProfile = useCallback(
    (profile: UserProfile) => {
      persist(profile);
      if (profile.uid && firebaseEnabled && !isDemoAuth()) {
        void updateUserProfileDoc(profile.uid, profile);
      }
    },
    [firebaseEnabled, persist],
  );

  const setMode = useCallback((next: AppMode) => {
    profileStore()?.setItem(APP_MODE_KEY, next);
    setSavedMode(next);
  }, []);

  const acceptRunnerTerms = useCallback(() => {
    profileStore()?.setItem(TERMS_ACCEPTED_KEY, "true");
    setTermsAccepted(true);
    setUser((prev) => {
      if (!prev) return prev;
      const termsAcceptedAt = prev.termsAcceptedAt ?? new Date().toISOString();
      const updated: UserProfile = { ...prev, termsAcceptedAt };
      cacheProfile(updated);
      if (prev.uid && firebaseEnabled && !isDemoAuth()) {
        void updateUserProfileDoc(prev.uid, { termsAcceptedAt });
      }
      return updated;
    });
  }, [firebaseEnabled]);

  const setRunnerRegistered = useCallback(
    (runnerId: string, payment: { method: "PayMe" | "FPS"; id: string }) => {
      setUser((prev) => {
        if (!prev) return prev;
        const termsAcceptedAt = prev.termsAcceptedAt ?? new Date().toISOString();
        const role = roleWithRunner(normalizeRole(prev.role, prev.isRunner));
        const updated: UserProfile = {
          ...prev,
          role,
          isRunner: true,
          runnerId,
          runnerPaymentMethod: payment.method,
          runnerPaymentId: payment.id,
          termsAcceptedAt,
        };
        cacheProfile(updated);
        if (prev.uid && firebaseEnabled && !isDemoAuth()) {
          void updateUserProfileDoc(prev.uid, {
            role,
            isRunner: true,
            runnerId,
            runnerPaymentMethod: payment.method,
            runnerPaymentId: payment.id,
            termsAcceptedAt,
          });
        }
        return updated;
      });
      profileStore()?.setItem(TERMS_ACCEPTED_KEY, "true");
      setTermsAccepted(true);
    },
    [firebaseEnabled],
  );

  const hasAcceptedTerms =
    termsAccepted || Boolean(user?.isRunner || user?.termsAcceptedAt);

  const role = normalizeRole(user?.role, Boolean(user?.isRunner));
  const canRunnerMode = Boolean(user) && roleAllowsRunner(role);
  const canSwitchModes = Boolean(user) && roleCanSwitchModes(role);
  // A saved preference only counts while the account still allows that mode,
  // so a customer never lands in runner chrome they cannot use.
  const mode: AppMode =
    canRunnerMode && savedMode ? savedMode : defaultModeForRole(role);

  const value = useMemo(
    () => ({
      user,
      isReady,
      termsAccepted: hasAcceptedTerms,
      firebaseEnabled,
      bootError,
      role,
      canRunnerMode,
      canSwitchModes,
      mode,
      setMode,
      login,
      signUp,
      signIn,
      ensureGuestCheckout,
      logout,
      updateProfile,
      acceptRunnerTerms,
      setRunnerRegistered,
    }),
    [
      user,
      isReady,
      hasAcceptedTerms,
      firebaseEnabled,
      bootError,
      role,
      canRunnerMode,
      canSwitchModes,
      mode,
      setMode,
      login,
      signUp,
      signIn,
      ensureGuestCheckout,
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

/**
 * Canonical identity for orders, active-order queries, and chat sends.
 * Prefer Auth uid always. studentId is NOT used here — chat access still
 * accepts studentId as a legacy fallback in `canAccessOrderChat`.
 */
export function getUserAccountId(user: UserProfile): string {
  return user.uid ?? "";
}
