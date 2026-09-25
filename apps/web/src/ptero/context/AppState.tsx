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
import { CAMPUS_ID } from "@/ptero/config/campus";
import type { CollegeId } from "@/ptero/config/canteen/colleges";
import { computeCollegeDiscount } from "@/ptero/config/canteen/colleges";
import { DEMO_CUSTOMER, DEMO_RUNNER } from "@/ptero/config/demo";
import { hashPassword } from "@/ptero/lib/auth";
import { notifyDiscountReceived, notifyOrderStatus } from "@/ptero/lib/canteen/notify";
import { readJson, STORAGE_KEYS, writeJson } from "@/ptero/lib/storage";
import type { AppMode, AppUser, Order, OrderStatus } from "@/ptero/lib/types";

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
  signOut: () => void;
  startGuest: (name: string) => AppUser;
  registerRunner: (opts: {
    phone: string;
    college: CollegeId;
  }) => Promise<AppUser>;
  placeOrder: (order: Omit<Order, "id" | "campus" | "createdAt" | "status">) => Order;
  updateOrder: (id: string, patch: Partial<Order>) => Order | null;
  acceptOrder: (id: string) => Order | null;
  markPurchased: (id: string, receiptTotal: number) => Order | null;
  markDelivered: (id: string) => Order | null;
  markPaid: (id: string) => Order | null;
}

const AppStateContext = createContext<AppStateValue | null>(null);

function publicUser(user: AppUser): AppUser {
  const { passwordHash: _omit, ...rest } = user;
  void _omit;
  return rest;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [user, setUser] = useState<AppUser | null>(null);
  const [mode, setModeState] = useState<AppMode>("customer");

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
    setOrders(loadedOrders);
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
        const session: AppUser = {
          uid: fbUser.uid,
          campus: CAMPUS_ID,
          name: fbUser.displayName || "Andrew",
          email: identifier,
          isGuest: false,
          isRunner: false,
        };
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

  const signOut = useCallback(() => {
    persistUser(null);
    setMode("customer");
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
      const next: AppUser = {
        ...user,
        isRunner: true,
        phone: opts.phone.trim(),
        college: opts.college,
      };
      persistUsers(users.map((u) => (u.uid === next.uid ? { ...u, ...next } : u)));
      persistUser(next);
      setMode("runner");
      return next;
    },
    [user, users, persistUsers, persistUser, setMode],
  );

  const placeOrder = useCallback(
    (draft: Omit<Order, "id" | "campus" | "createdAt" | "status">) => {
      const order: Order = {
        ...draft,
        id: `CYU-${Date.now().toString(36).toUpperCase()}`,
        campus: CAMPUS_ID,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      persistOrders([order, ...orders]);
      return order;
    },
    [orders, persistOrders],
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
    (id: string) => {
      if (!user?.isRunner) throw new Error("Only runners can update this order.");
      const current = orders.find((o) => o.id === id);
      if (!current || current.status !== "pending") return null;

      const { discountApplied, discountAmount } = computeCollegeDiscount(
        current.subtotal,
        user.college,
        current.canteenCollege,
      );

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
