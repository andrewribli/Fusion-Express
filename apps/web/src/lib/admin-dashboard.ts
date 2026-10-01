import {
  collection,
  getAggregateFromServer,
  getCountFromServer,
  query,
  sum,
  where,
  Timestamp,
  type Query,
} from "firebase/firestore";
import { collectionName } from "@/lib/constants";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { runnerReimburseTotal } from "@/lib/order-status";
import {
  fetchAdminReviewOrders,
} from "@/lib/orders";
import { fetchAllUsers } from "@/lib/users";
import type { UserProfile } from "@/context/UserContext";
import { hasPayoutOnFile } from "@fusion-express/shared/payout";
import { normalizeRole } from "@/lib/roles";

const ORDERS = collectionName("orders");
const USERS = collectionName("users");

function detectCampusFromEmail(email?: string | null): "cuhk" | "cityu" | null {
  const domain = (email ?? "").trim().toLowerCase().split("@").pop() ?? "";
  if (domain === "link.cuhk.edu.hk" || domain === "cuhk.edu.hk") return "cuhk";
  if (domain === "cityu.edu.hk" || domain === "my.cityu.edu.hk") return "cityu";
  return null;
}

export type AdminListFilter =
  | "all"
  | "customers"
  | "runners"
  | "cuhk"
  | "cityu"
  | "missing_info"
  | "pending_payouts"
  | "no_payout_method"
  | "missing_receipt"
  | "orders_today"
  | "active_runners"
  | "new_users"
  | "revenue"
  | "discount_fees";

export type AdminSort =
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc"
  | "campus";

export interface AdminDashboardStats {
  pendingPayoutHkd: number;
  pendingPayoutCount: number;
  ordersToday: number;
  activeRunners: number;
  newUsers7d: number;
  revenueMonthHkd: number;
  discountFeesMonthHkd: number;
  missingReceiptCount: number;
  noPayoutMethodCount: number;
  missingInfoCount: number;
  /** Wall time for the stats batch (ms). */
  statsMs: number;
  /** Soft failures (missing indexes, etc.). */
  warnings: string[];
}

function startOfTodayHkt(): Date {
  // HKT = UTC+8
  const now = new Date();
  const hktMs = now.getTime() + 8 * 60 * 60 * 1000;
  const hkt = new Date(hktMs);
  const y = hkt.getUTCFullYear();
  const m = hkt.getUTCMonth();
  const d = hkt.getUTCDate();
  // Convert HKT midnight back to UTC Date
  return new Date(Date.UTC(y, m, d) - 8 * 60 * 60 * 1000);
}

function startOfMonthHkt(): Date {
  const now = new Date();
  const hktMs = now.getTime() + 8 * 60 * 60 * 1000;
  const hkt = new Date(hktMs);
  const y = hkt.getUTCFullYear();
  const m = hkt.getUTCMonth();
  return new Date(Date.UTC(y, m, 1) - 8 * 60 * 60 * 1000);
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function safeCount(q: Query, warnings: string[], label: string): Promise<number> {
  try {
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (err) {
    warnings.push(
      `${label}: ${err instanceof Error ? err.message : "count failed"}`,
    );
    return 0;
  }
}

async function safeSum(
  q: Query,
  field: string,
  warnings: string[],
  label: string,
): Promise<number> {
  try {
    const snap = await getAggregateFromServer(q, {
      total: sum(field),
    });
    const raw = snap.data().total;
    return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
  } catch (err) {
    warnings.push(
      `${label}: ${err instanceof Error ? err.message : "sum failed"}`,
    );
    return 0;
  }
}

/**
 * Metrics via Firestore count()/sum() aggregates. Pending payout HKD also
 * uses review orders because reimbursement = groceries + fee (no single field).
 */
export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const started = performance.now();
  const warnings: string[] = [];

  if (!isFirebaseConfigured()) {
    return {
      pendingPayoutHkd: 128.5,
      pendingPayoutCount: 2,
      ordersToday: 5,
      activeRunners: 3,
      newUsers7d: 4,
      revenueMonthHkd: 420,
      discountFeesMonthHkd: 36,
      missingReceiptCount: 1,
      noPayoutMethodCount: 0,
      missingInfoCount: 0,
      statsMs: performance.now() - started,
      warnings: ["Local preview — Firebase not configured; showing sample metrics"],
    };
  }

  const db = getDb();
  const today = Timestamp.fromDate(startOfTodayHkt());
  const monthStart = Timestamp.fromDate(startOfMonthHkt());
  const weekAgo = Timestamp.fromDate(daysAgo(7));

  const [
    ordersToday,
    activeRunners,
    newUsers7d,
    pendingPayoutCount,
    revenueMonthHkd,
    discountFeesMonthHkd,
    reviewOrders,
  ] = await Promise.all([
    safeCount(
      query(collection(db, ORDERS), where("createdAt", ">=", today)),
      warnings,
      "Orders today",
    ),
    // No lastActiveAt in schema yet — count registered runners.
    safeCount(
      query(collection(db, USERS), where("isRunner", "==", true)),
      warnings,
      "Active runners",
    ),
    safeCount(
      query(collection(db, USERS), where("createdAt", ">=", weekAgo)),
      warnings,
      "New users",
    ),
    safeCount(
      query(collection(db, ORDERS), where("status", "==", "delivered")),
      warnings,
      "Pending payouts",
    ),
    safeSum(
      query(
        collection(db, ORDERS),
        where("createdAt", ">=", monthStart),
        where("status", "in", [
          "paid",
          "customer_paid",
          "runner_paid",
          "completed",
        ]),
      ),
      "deliveryFee",
      warnings,
      "Revenue",
    ),
    // collegeDiscountFeesEarned not stored yet — sum discountAmount when present.
    safeSum(
      query(collection(db, ORDERS), where("createdAt", ">=", monthStart)),
      "discountAmount",
      warnings,
      "Discount fees",
    ),
    fetchAdminReviewOrders().catch((err) => {
      warnings.push(
        `Review orders: ${err instanceof Error ? err.message : "failed"}`,
      );
      return [];
    }),
  ]);

  const delivered = reviewOrders.filter((o) => o.status === "delivered");
  const pendingPayoutHkd = delivered.reduce(
    (sumAmt, o) => sumAmt + runnerReimburseTotal(o),
    0,
  );
  const missingReceiptCount = reviewOrders.filter(
    (o) =>
      (o.status === "delivered" || o.status === "purchased") && !o.receiptUrl,
  ).length;

  return {
    pendingPayoutHkd: Math.round(pendingPayoutHkd * 100) / 100,
    pendingPayoutCount,
    ordersToday,
    activeRunners,
    newUsers7d,
    revenueMonthHkd: Math.round(revenueMonthHkd * 100) / 100,
    discountFeesMonthHkd: Math.round(discountFeesMonthHkd * 100) / 100,
    missingReceiptCount,
    noPayoutMethodCount: 0, // filled after users load
    missingInfoCount: 0,
    statsMs: performance.now() - started,
    warnings,
  };
}

export function userCampus(user: UserProfile): "cuhk" | "cityu" | null {
  if (user.email) {
    const fromEmail = detectCampusFromEmail(user.email);
    if (fromEmail) return fromEmail;
  }
  return null;
}

export function userMissingInfo(user: UserProfile): boolean {
  const noName = !user.fullName?.trim() || user.fullName === "Guest";
  const noEmail = !user.email?.trim();
  return noName || noEmail;
}

export function userIsDemo(user: UserProfile): boolean {
  const uid = user.uid ?? "";
  const email = (user.email ?? "").toLowerCase();
  return (
    uid.startsWith("demo_") ||
    email.startsWith("demo@") ||
    email.includes("+demo@")
  );
}

export function runnerMissingPayout(user: UserProfile): boolean {
  if (!user.isRunner && normalizeRole(user.role, user.isRunner) === "customer") {
    return false;
  }
  if (!user.isRunner) return false;
  return !hasPayoutOnFile({
    payoutMethod: user.payoutMethod,
    payoutDetails: user.payoutDetails,
    runnerPaymentMethod: user.runnerPaymentMethod,
    runnerPaymentId: user.runnerPaymentId,
  });
}

export async function fetchAdminUsers(): Promise<UserProfile[]> {
  if (!isFirebaseConfigured()) {
    const now = Date.now();
    return [
      {
        uid: "local-1",
        fullName: "Pauline Sidharta",
        email: "1155233599@link.cuhk.edu.hk",
        isRunner: true,
        role: "both",
        createdAt: new Date(now - 2 * 86400000).toISOString(),
        runnerPaymentMethod: "FPS",
        runnerPaymentId: "91234567",
        payoutMethod: "fps",
        payoutDetails: { fpsId: "91234567", accountHolderName: "Pauline Sidharta" },
      },
      {
        uid: "local-2",
        fullName: "",
        email: "newstudent@my.cityu.edu.hk",
        isRunner: false,
        role: "customer",
        createdAt: new Date(now - 1 * 86400000).toISOString(),
      },
      {
        uid: "local-3",
        fullName: "Demo Runner",
        email: "demo@my.cityu.edu.hk",
        isRunner: true,
        role: "runner",
        createdAt: new Date(now - 10 * 86400000).toISOString(),
      },
      {
        uid: "local-4",
        fullName: "Alex Chen",
        email: "alex.chen@link.cuhk.edu.hk",
        isRunner: true,
        role: "both",
        createdAt: new Date(now - 40 * 86400000).toISOString(),
      },
      {
        uid: "local-5",
        fullName: "Jordan Lee",
        email: "jordan.lee@my.cityu.edu.hk",
        phone: "51234567",
        isRunner: false,
        role: "customer",
        createdAt: new Date(now - 3 * 86400000).toISOString(),
      },
    ];
  }
  return fetchAllUsers();
}

export function filterAndSortUsers(
  users: UserProfile[],
  opts: {
    search: string;
    filter: AdminListFilter;
    sort: AdminSort;
    showDemo: boolean;
  },
): UserProfile[] {
  const q = opts.search.trim().toLowerCase();
  let rows = users.filter((u) => {
    if (!opts.showDemo && userIsDemo(u)) return false;
    if (q) {
      const hay = `${u.fullName ?? ""} ${u.email ?? ""} ${u.phone ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    const campus = userCampus(u);
    const role = normalizeRole(u.role, Boolean(u.isRunner));
    switch (opts.filter) {
      case "customers":
        return role === "customer" || role === "both";
      case "runners":
      case "active_runners":
        return Boolean(u.isRunner) || role === "runner" || role === "both";
      case "cuhk":
        return campus === "cuhk";
      case "cityu":
        return campus === "cityu";
      case "missing_info":
        return userMissingInfo(u);
      case "no_payout_method":
        return runnerMissingPayout(u);
      case "new_users": {
        if (!u.createdAt) return false;
        const t = new Date(u.createdAt).getTime();
        return t >= daysAgo(7).getTime();
      }
      case "pending_payouts":
      case "missing_receipt":
      case "orders_today":
      case "revenue":
      case "discount_fees":
        // Order-centric filters: keep runners / all users visible; UI also
        // deep-links to payouts. Default to all for the user table.
        return true;
      default:
        return true;
    }
  });

  rows = [...rows].sort((a, b) => {
    switch (opts.sort) {
      case "oldest": {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ta - tb;
      }
      case "name_asc":
        return (a.fullName || "").localeCompare(b.fullName || "", "en", {
          sensitivity: "base",
        });
      case "name_desc":
        return (b.fullName || "").localeCompare(a.fullName || "", "en", {
          sensitivity: "base",
        });
      case "campus": {
        const ca = userCampus(a) ?? "zzz";
        const cb = userCampus(b) ?? "zzz";
        if (ca !== cb) return ca.localeCompare(cb);
        return (a.fullName || "").localeCompare(b.fullName || "", "en", {
          sensitivity: "base",
        });
      }
      case "newest":
      default: {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      }
    }
  });

  return rows;
}

export function countActionExtras(users: UserProfile[]): {
  noPayoutMethodCount: number;
  missingInfoCount: number;
} {
  return {
    noPayoutMethodCount: users.filter(runnerMissingPayout).length,
    missingInfoCount: users.filter(userMissingInfo).length,
  };
}
