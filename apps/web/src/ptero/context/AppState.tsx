"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CAMPUS_ID } from "@/ptero/config/campus";
import type { CollegeId } from "@/ptero/config/canteen/colleges";
import {
  computeCollegeDiscount,
  getCollege,
} from "@/ptero/config/canteen/colleges";
import { DEMO_CUSTOMER, DEMO_RUNNER } from "@/ptero/config/demo";
import { hashPassword } from "@/ptero/lib/auth";
import { notifyDiscountReceived, notifyOrderStatus } from "@/ptero/lib/canteen/notify";
import { readJson, STORAGE_KEYS, writeJson } from "@/ptero/lib/storage";
import type { AppMode, AppUser, Order, OrderStatus } from "@/ptero/lib/types";
import {
  isOwnCustomerOrder,
  SelfPickupError,
} from "@fusion-express/shared/orders";
import { useUser as useSharedUser, type UserProfile } from "@/context/UserContext";
import { normalizePhone, signOutUser } from "@/lib/auth";
import { accessCampusForUser } from "@/lib/campus-access";
import { clearStoredCampusPreference } from "@/lib/campus-routes";
import { findRunnerForUser, registerRunner as registerRunnerDoc } from "@/lib/runners";
import { fetchUserProfile, updateUserProfileDoc } from "@/lib/users";
import {
  acceptPteroOrderOnFirestore,
  isCloudOrderId,
  persistPteroOrderToFirestore,
  subscribeCityuPendingOrders,
} from "@/ptero/lib/firestore-orders";

async function ensureDemoUsers(existing: AppUser[]): Promise<AppUser[]> {
  let next = [...existing];
  const customerHash = await hashPassword(DEMO_CUSTOMER.password);
  const runnerHash = await hashPassword(DEMO_RUNNER.password);

  if (!next.some((u) => u.email === DEMO_CUSTOMER.email)) {
    next.push({
      uid: DEMO_CUSTOMER.uid,
      campus: CAMPUS_ID,
      name: DEMO_CUSTOMER.name,
      email: DEMO_CUSTOMER.email,
      isGuest: false,
      isRunner: false,
      passwordHash: customerHash,
    });
  }

  const runnerIdx = next.findIndex((u) => u.email === DEMO_RUNNER.email);
  if (runnerIdx === -1) {
    next.push({
      uid: DEMO_RUNNER.uid,
      campus: CAMPUS_ID,
      name: DEMO_RUNNER.name,
      email: DEMO_RUNNER.email,
      phone: DEMO_RUNNER.phone,
      college: DEMO_RUNNER.college,
      isGuest: false,
      isRunner: true,
      passwordHash: runnerHash,
    });
  } else if (!next[runnerIdx].college) {
    next[runnerIdx] = { ...next[runnerIdx], college: DEMO_RUNNER.college };
  }

  return next;
}

interface AppStateValue {
  isReady: boolean;
  user: AppUser | null;
  users: AppUser[];
  orders: Order[];
  /** Set when the Firestore pending board could not be read. */
  ordersLoadError: string;
  mode: AppMode;
  canRunnerMode: boolean;
  setMode: (mode: AppMode) => void;
  signUp: (opts: {
    name: string;
    email: string;
    password: string;
    asRunner?: boolean;
    phone?: string;
  }) => Promise<AppUser>;
  signIn: (email: string, password: string) => Promise<AppUser>;
  signOut: () => Promise<void>;
  startGuest: (name: string) => AppUser;
  registerRunner: (opts: {
    phone: string;
    college: CollegeId;
  }) => Promise<AppUser>;
  placeOrder: (
    order: Omit<Order, "id" | "campus" | "createdAt" | "status">,
  ) => Promise<Order>;
  updateOrder: (id: string, patch: Partial<Order>) => Order | null;
  acceptOrder: (id: string) => Promise<Order | null>;
  markPurchased: (id: string, receiptTotal: number) => Order | null;
  markDelivered: (id: string) => Order | null;
  markPaid: (id: string) => Order | null;
}

const AppStateContext = createContext<AppStateValue | null>(null);

/**
 * The shared GraceRun session (Firebase) is what `/login` treats as signed in.
 * CityU chrome reads this prototype store instead, so a real session still
 * showed "Sign in", and that link bounced straight back to `/cityu`.
 */
export function appUserFromSharedProfile(
  profile: UserProfile | null | undefined,
): AppUser | null {
  if (!profile?.uid || profile.isGuest) return null;
  if (accessCampusForUser(profile) !== "cityu") return null;
  const college = getCollege(profile.college);
  return {
    uid: profile.uid,
    campus: CAMPUS_ID,
    name: profile.fullName?.trim() || "CityU student",
    email: profile.email?.trim().toLowerCase() || null,
    isGuest: false,
    isRunner: Boolean(profile.isRunner),
    phone: profile.phone,
    college: college?.id,
    runnerDocId: profile.runnerId,
  };
}

function publicUser(user: AppUser): AppUser {
  const { passwordHash: _omit, ...rest } = user;
  void _omit;
  return rest;
}

function mergeCloudPendingOrders(local: Order[], cloudPending: Order[]): Order[] {
  const byId = new Map<string, Order>();
  for (const order of local) {
    if (isCloudOrderId(order.id) && order.status === "pending") continue;
    byId.set(order.id, order);
  }
  for (const order of cloudPending) {
    byId.set(order.id, order);
  }
  return [...byId.values()].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoadError, setOrdersLoadError] = useState("");
  const [user, setUser] = useState<AppUser | null>(null);
  const [mode, setModeState] = useState<AppMode>("customer");
  /** Latest Firestore pending board. localStorage reloads must not drop it. */
  const cloudPendingRef = useRef<Order[]>([]);
  /** Uid copied from the shared session. Cleared when that session ends. */
  const adoptedUidRef = useRef<string | null>(null);
  const signingOutRef = useRef(false);
  const shared = useSharedUser();

  const persistUsers = useCallback((next: AppUser[]) => {
    setUsers(next);
    writeJson(STORAGE_KEYS.users, next);
  }, []);

  const persistOrders = useCallback((next: Order[]) => {
    setOrders(next);
    writeJson(STORAGE_KEYS.orders, next);
  }, []);

  const persistUser = useCallback((next: AppUser | null) => {
    setUser(next ? publicUser(next) : null);
    writeJson(STORAGE_KEYS.currentUser, next ? publicUser(next) : null);
  }, []);

  const reload = useCallback(() => {
    const loadedUsers = readJson<AppUser[]>(STORAGE_KEYS.users, []);
    const loadedOrders = readJson<Order[]>(STORAGE_KEYS.orders, []);
    const loadedUser = readJson<AppUser | null>(STORAGE_KEYS.currentUser, null);
    const loadedMode = readJson<AppMode>(STORAGE_KEYS.mode, "customer");
    setUsers(loadedUsers);
    // Any localStorage write dispatches gracerun-cityu-sync. Reloading the
    // stored list alone wiped Firestore pending that this browser never saved.
    setOrders(mergeCloudPendingOrders(loadedOrders, cloudPendingRef.current));
    setUser(loadedUser);
    setModeState(loadedMode);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loadedUsers = readJson<AppUser[]>(STORAGE_KEYS.users, []);
      const withDemos = await ensureDemoUsers(loadedUsers);
      if (withDemos.length !== loadedUsers.length) {
        writeJson(STORAGE_KEYS.users, withDemos);
      }
      if (!cancelled) {
        reload();
        setIsReady(true);
      }
    })();
    const onSync = () => reload();
    window.addEventListener("gracerun-cityu-sync", onSync);
    window.addEventListener("storage", onSync);
    return () => {
      cancelled = true;
      window.removeEventListener("gracerun-cityu-sync", onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [reload]);

  useEffect(() => {
    if (!isReady || !shared.isReady || signingOutRef.current) return;
    const mirrored = appUserFromSharedProfile(shared.user);
    if (mirrored) {
      adoptedUidRef.current = mirrored.uid;
      if (user?.uid !== mirrored.uid || user.isGuest) persistUser(mirrored);
      return;
    }
    if (user && adoptedUidRef.current && user.uid === adoptedUidRef.current) {
      adoptedUidRef.current = null;
      persistUser(null);
    }
  }, [isReady, persistUser, shared.isReady, shared.user, user?.isGuest, user?.uid]);

  useEffect(() => {
    if (!isReady) return;
    // Guest CYU-* tickets stay in the placing browser's localStorage only.
    // Signed-in checkout writes Firestore; this subscription is the board.
    return subscribeCityuPendingOrders(
      (cloudPending) => {
        cloudPendingRef.current = cloudPending;
        setOrdersLoadError("");
        setOrders((prev) => mergeCloudPendingOrders(prev, cloudPending));
      },
      {
        excludeCustomerId: user?.uid,
        excludeCustomerEmail: user?.email,
        onError: (err) => {
          setOrdersLoadError(
            err.message || "Could not load available CityU orders.",
          );
        },
      },
    );
  }, [isReady, user?.uid, user?.email]);

  const setMode = useCallback((next: AppMode) => {
    setModeState(next);
    writeJson(STORAGE_KEYS.mode, next);
  }, []);

  const signUp = useCallback(
    async (opts: {
      name: string;
      email: string;
      password: string;
      asRunner?: boolean;
      phone?: string;
    }) => {
      const email = opts.email.trim().toLowerCase();
      const existing = users.find((u) => u.email === email);
      if (existing) throw new Error("An account with this CityU email already exists.");

      let uid = crypto.randomUUID();
      try {
        const { firebaseSignUp } = await import("@/ptero/lib/firebase-auth");
        const fbUser = await firebaseSignUp({
          email,
          password: opts.password,
          fullName: opts.name.trim(),
        });
        uid = fbUser.uid;
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        // Propagate domain/auth failures; only soft-skip missing Firebase config.
        if (
          message.includes("Firebase is not configured") ||
          message.includes("NEXT_PUBLIC_FIREBASE")
        ) {
          console.warn("Firebase signup skipped:", err);
        } else {
          throw err instanceof Error ? err : new Error(message || "Sign up failed");
        }
      }

      const created: AppUser = {
        uid,
        campus: CAMPUS_ID,
        name: opts.name.trim(),
        email,
        isGuest: false,
        isRunner: Boolean(opts.asRunner),
        phone: opts.phone?.trim() || undefined,
        passwordHash: await hashPassword(opts.password),
      };
      persistUsers([...users, created]);
      persistUser(created);
      if (created.isRunner) setMode("runner");
      return publicUser(created);
    },
    [users, persistUsers, persistUser, setMode],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const identifier = email.trim().toLowerCase();
      try {
        const { firebaseSignIn } = await import("@/ptero/lib/firebase-auth");
        const fbUser = await firebaseSignIn(identifier, password);
        const local = users.find((u) => u.email === identifier);
        const profile = await fetchUserProfile(fbUser.uid);
        const session: AppUser = {
          uid: fbUser.uid,
          campus: CAMPUS_ID,
          name:
            local?.name ||
            profile?.fullName?.trim() ||
            fbUser.displayName ||
            "CityU student",
          email: identifier,
          isGuest: false,
          isRunner: Boolean(local?.isRunner || profile?.isRunner),
          phone: local?.phone || profile?.phone,
          college: (local?.college ||
            (profile?.college as CollegeId | undefined)) as CollegeId | undefined,
          runnerDocId: profile?.runnerId || local?.runnerDocId,
        };
        if (local && local.uid !== fbUser.uid) {
          persistUsers(
            users.map((u) =>
              u.email === identifier ? { ...session, passwordHash: u.passwordHash } : u,
            ),
          );
        }
        if (
          session.isRunner &&
          !session.runnerDocId &&
          session.phone &&
          session.college
        ) {
          try {
            const residence = getCollege(session.college);
            const runnerDocId = await registerRunnerDoc({
              uid: session.uid,
              fullName: session.name.trim() || "Runner",
              studentId: session.uid.slice(0, 12),
              phone: session.phone,
              college: session.college,
              hall: residence?.compound ?? "",
              paymentMethod: "PayMe",
              paymentId: session.phone,
            });
            await updateUserProfileDoc(session.uid, {
              isRunner: true,
              runnerId: runnerDocId,
              phone: session.phone,
              college: session.college,
              fullName: session.name.trim() || "Runner",
            });
            session.runnerDocId = runnerDocId;
          } catch (err) {
            console.warn("CityU runner profile sync on sign-in:", err);
          }
        }
        persistUser(session);
        return publicUser(session);
      } catch {
        // Fall through to local prototype auth.
      }
      const found = users.find((u) => u.email === identifier);
      if (!found?.passwordHash) throw new Error("No account found for this CityU email.");
      const hashed = await hashPassword(password);
      if (hashed !== found.passwordHash) throw new Error("Incorrect password.");
      persistUser(found);
      return publicUser(found);
    },
    [users, persistUser],
  );

  const signOut = useCallback(async () => {
    // CityU sign-out only cleared the prototype user in localStorage.
    // Firebase Auth (shared with the rest of GraceRun) stayed signed in,
    // and `gracerun_campus` stayed `cityu`, so `/` kept redirecting here.
    signingOutRef.current = true;
    adoptedUidRef.current = null;
    persistUser(null);
    setMode("customer");
    clearStoredCampusPreference();
    try {
      const { firebaseSignOutUser } = await import("@/ptero/lib/firebase-auth");
      await firebaseSignOutUser();
    } catch {
      // Prototype builds without CityU Firebase config still sign out locally.
    }
    try {
      await signOutUser();
    } catch {
      // Shared Auth may already be signed out, or unconfigured.
    } finally {
      signingOutRef.current = false;
    }
  }, [persistUser, setMode]);

  const startGuest = useCallback(
    (name: string) => {
      const guest: AppUser = {
        uid: user?.isGuest ? user.uid : crypto.randomUUID(),
        campus: CAMPUS_ID,
        name: name.trim() || "Guest",
        email: null,
        isGuest: true,
        isRunner: false,
      };
      persistUser(guest);
      return guest;
    },
    [user, persistUser],
  );

  const registerRunner = useCallback(
    async (opts: { phone: string; college: CollegeId }) => {
      if (!user || user.isGuest || !user.email) {
        throw new Error("Sign up with your CityU email before becoming a runner.");
      }
      const phone = normalizePhone(opts.phone);
      const residence = getCollege(opts.college);
      let runnerDocId = user.runnerDocId;
      try {
        runnerDocId = await registerRunnerDoc({
          uid: user.uid,
          fullName: user.name.trim() || "Runner",
          studentId: user.uid.slice(0, 12),
          phone,
          college: opts.college,
          hall: residence?.compound ?? "",
          paymentMethod: "PayMe",
          paymentId: phone,
        });
        await updateUserProfileDoc(user.uid, {
          isRunner: true,
          runnerId: runnerDocId,
          phone,
          college: opts.college,
          fullName: user.name.trim() || "Runner",
        });
      } catch (err) {
        console.warn("CityU runner Firestore registration:", err);
      }
      const next: AppUser = {
        ...user,
        isRunner: true,
        phone,
        college: opts.college,
        runnerDocId,
      };
      persistUsers(users.map((u) => (u.uid === next.uid ? { ...u, ...next } : u)));
      persistUser(next);
      setMode("runner");
      return next;
    },
    [user, users, persistUsers, persistUser, setMode],
  );

  const placeOrder = useCallback(
    async (draft: Omit<Order, "id" | "campus" | "createdAt" | "status">) => {
      let id = `CYU-${Date.now().toString(36).toUpperCase()}`;
      try {
        const cloudId = await persistPteroOrderToFirestore(draft);
        if (cloudId) id = cloudId;
      } catch (err) {
        console.error("CityU Firestore placeOrder failed", err);
        throw err instanceof Error
          ? err
          : new Error("Could not place order. Try again.");
      }
      const order: Order = {
        ...draft,
        id,
        campus: CAMPUS_ID,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      setOrders((prev) => {
        const next = mergeCloudPendingOrders(prev, [order]);
        if (!isCloudOrderId(id)) {
          writeJson(STORAGE_KEYS.orders, next);
        }
        return next;
      });
      return order;
    },
    [],
  );

  const updateOrder = useCallback(
    (id: string, patch: Partial<Order>) => {
      const current = orders.find((o) => o.id === id);
      if (!current) return null;
      const next = { ...current, ...patch };
      persistOrders(orders.map((o) => (o.id === id ? next : o)));
      return next;
    },
    [orders, persistOrders],
  );

  const withRunner = useCallback(
    (id: string, status: OrderStatus, extra: Partial<Order> = {}) => {
      if (!user?.isRunner) throw new Error("Only runners can update this order.");
      return updateOrder(id, {
        status,
        runnerId: user.uid,
        runnerName: user.name,
        runnerPhone: user.phone,
        ...extra,
      });
    },
    [user, updateOrder],
  );

  const acceptOrder = useCallback(
    async (id: string) => {
      if (!user?.isRunner) throw new Error("Only runners can update this order.");
      const current = orders.find((o) => o.id === id);
      if (!current || current.status !== "pending") return null;
      if (current.runnerId) {
        throw new Error("This order was already accepted by another runner.");
      }
      if (
        isOwnCustomerOrder(current, {
          uid: user.uid,
          email: user.email,
        })
      ) {
        throw new SelfPickupError();
      }

      const { discountApplied, discountAmount } = computeCollegeDiscount(
        current.subtotal,
        user.college,
        current.canteenCollege,
      );
      const discountedSubtotal = discountApplied
        ? Math.max(0, current.subtotal - discountAmount)
        : current.subtotal;
      const discountedTotal =
        discountedSubtotal + current.deliveryFee + current.tip;

      if (isCloudOrderId(id)) {
        const runnerDoc =
          user.runnerDocId != null
            ? { id: user.runnerDocId }
            : await findRunnerForUser({ uid: user.uid });
        if (!runnerDoc?.id) {
          throw new Error("Register as a runner before accepting orders.");
        }
        await acceptPteroOrderOnFirestore({
          orderId: id,
          runnerDocId: runnerDoc.id,
          runnerUid: user.uid,
          runnerName: user.name,
          runnerEmail: user.email,
          runnerPhone: user.phone,
          discount: {
            discountApplied,
            discountAmount,
            runnerCollege: user.college ?? undefined,
            canteenCollege: current.canteenCollege ?? undefined,
            subtotal: discountedSubtotal,
            total: discountedTotal,
          },
        });
      }

      const next = updateOrder(id, {
        status: "accepted",
        runnerId: user.uid,
        runnerName: user.name,
        runnerPhone: user.phone,
        runnerCollege: user.college ?? null,
        discountApplied,
        discountAmount,
      });

      if (next && discountApplied) {
        notifyDiscountReceived({ order: next, runnerCollege: user.college });
      }
      if (next) {
        notifyOrderStatus({ order: next, event: "accepted" });
      }
      return next;
    },
    [user, orders, updateOrder],
  );

  const markPurchased = useCallback(
    (id: string, receiptTotal: number) => {
      const next = withRunner(id, "purchased", { receiptTotal });
      if (next) notifyOrderStatus({ order: next, event: "purchased" });
      return next;
    },
    [withRunner],
  );

  const markDelivered = useCallback(
    (id: string) => {
      const next = withRunner(id, "delivered");
      if (next) notifyOrderStatus({ order: next, event: "delivered" });
      return next;
    },
    [withRunner],
  );

  const markPaid = useCallback(
    (id: string) => {
      const next = updateOrder(id, {
        status: "paid",
        paidAt: new Date().toISOString(),
        paidVia: "airwallex",
      });
      if (next) notifyOrderStatus({ order: next, event: "paid" });
      return next;
    },
    [updateOrder],
  );

  const canRunnerMode = Boolean(user?.isRunner);

  const value = useMemo(
    () => ({
      isReady,
      user,
      users,
      orders,
      ordersLoadError,
      mode,
      canRunnerMode,
      setMode,
      signUp,
      signIn,
      signOut,
      startGuest,
      registerRunner,
      placeOrder,
      updateOrder,
      acceptOrder,
      markPurchased,
      markDelivered,
      markPaid,
    }),
    [
      isReady,
      user,
      users,
      orders,
      ordersLoadError,
      mode,
      canRunnerMode,
      setMode,
      signUp,
      signIn,
      signOut,
      startGuest,
      registerRunner,
      placeOrder,
      updateOrder,
      acceptOrder,
      markPurchased,
      markDelivered,
      markPaid,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}

export function useUser() {
  const { user, isReady, mode, setMode, canRunnerMode, signOut } = useAppState();
  return { user, isReady, mode, setMode, canRunnerMode, signOut };
}
