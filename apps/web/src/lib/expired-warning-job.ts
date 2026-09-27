import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { supermarketPickupLocation } from "@fusion-express/shared/campus";
import { collectionName } from "@/lib/constants";
import { getCanteenMeta } from "@/lib/canteenConfig";
import { GROCERY_SOURCES } from "@/lib/grocerySources";
import { sendRunnerExpiredWarningEmail } from "@/lib/email";
import { getAdminDb } from "@/lib/firebase-admin";
import { getRestaurant } from "@/ptero/config/canteen/restaurants";
import {
  claimBlocksResend,
  deliverExpiredWarning,
  isRunnerExpiryDue,
  type ExpiredWarningOrder,
  type ExpiredWarningOutcome,
} from "@/lib/expired-warning";

const OPEN_STATUSES = [
  "accepted",
  "purchased",
  "receipt_uploaded",
  "assigned",
  "picked",
  "expired",
] as const;

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function pickupOrigin(data: Record<string, unknown>): string {
  const sourceId = asString(data.sourceId);
  const canteenId = asString(data.canteenRestaurantId);
  const channel = asString(data.orderChannel);
  const canteenKey = canteenId || (channel === "canteen" ? sourceId : "");
  if (channel === "canteen" || canteenKey) {
    const id = canteenKey || sourceId;
    const cityu = id ? getRestaurant(id) : undefined;
    if (cityu) return cityu.pickupLabel || cityu.name;
    const cuhk = id ? getCanteenMeta(id) : undefined;
    if (cuhk?.name) return cuhk.name;
    if (id) return id;
  }
  if (sourceId === "taste" || sourceId === "wellcome") {
    return GROCERY_SOURCES[sourceId].pickup;
  }
  return supermarketPickupLocation(data.campus);
}

export function deliveryDestination(data: Record<string, unknown>): string {
  const room = asString(data.roomNumber);
  const lobby = asString(data.lobbyPoint);
  const parts = [
    asString(data.college),
    asString(data.hall),
    room ? `Room ${room}` : "",
    lobby ? `Lobby ${lobby}` : "",
  ].filter(Boolean);
  return parts.join(", ") || "See the GraceRun app";
}

function toWarningOrder(
  id: string,
  data: Record<string, unknown>,
): ExpiredWarningOrder {
  return {
    id,
    status: asString(data.status) || "pending",
    runnerUid: asString(data.runnerUid) || undefined,
    runnerName: asString(data.runnerName) || undefined,
    runnerEmail: asString(data.runnerEmail) || undefined,
    customerName: asString(data.customerName) || undefined,
    customerEmail: asString(data.customerEmail) || undefined,
    customerPhone: asString(data.customerPhone) || undefined,
    acceptedAt: asDate(data.acceptedAt),
    runnerDeadline: asDate(data.runnerDeadline),
    runnerExpiredAt: asDate(data.runnerExpiredAt),
    expiredWarningSentAt: asDate(data.expiredWarningSentAt),
    expiredWarningClaimAt: asDate(data.expiredWarningClaimAt),
    expiredWarningSkippedAt: asDate(data.expiredWarningSkippedAt),
    expiredWarningFailedAt: asDate(data.expiredWarningFailedAt),
    origin: pickupOrigin(data),
    destination: deliveryDestination(data),
  };
}

export type ExpireJobSummary = {
  considered: number;
  sent: number;
  skipped: number;
  failed: number;
  alreadySent: number;
};

/**
 * Server path that stamps runnerExpiredAt and emails the runner once.
 * Email errors are logged and stored; they never reject the caller.
 */
export async function processExpiredDeliveryWarnings(
  now = new Date(),
): Promise<ExpireJobSummary> {
  const summary: ExpireJobSummary = {
    considered: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    alreadySent: 0,
  };
  const db = getAdminDb();
  if (!db) {
    console.error("expire deliveries: admin Firestore is unavailable");
    return summary;
  }

  const orders = db.collection(collectionName("orders"));
  const snap = await orders.where("status", "in", [...OPEN_STATUSES]).limit(300).get();

  for (const docSnap of snap.docs) {
    const data = (docSnap.data() ?? {}) as Record<string, unknown>;
    const preview = toWarningOrder(docSnap.id, data);
    if (preview.status === "cancelled") continue;
    if (!isRunnerExpiryDue(preview, now)) continue;
    if (preview.expiredWarningSentAt) {
      summary.alreadySent += 1;
      continue;
    }
    if (preview.expiredWarningSkippedAt || preview.expiredWarningFailedAt) {
      summary.skipped += 1;
      continue;
    }
    summary.considered += 1;
    tally(summary, await deliverForOrder(db, docSnap.id, data, now));
  }

  return summary;
}

/** Persist expiry and send the one-time warning for a single order. Never throws. */
export async function warnExpiredOrderById(
  orderId: string,
  now = new Date(),
): Promise<ExpiredWarningOutcome> {
  const db = getAdminDb();
  if (!db) {
    console.error("expire deliveries: admin Firestore is unavailable");
    return "missing";
  }
  const snap = await db.collection(collectionName("orders")).doc(orderId).get();
  if (!snap.exists) return "missing";
  const data = (snap.data() ?? {}) as Record<string, unknown>;
  const preview = toWarningOrder(orderId, data);
  if (preview.status === "cancelled") return "cancelled";
  if (!isRunnerExpiryDue(preview, now)) return "not_expired";
  if (preview.expiredWarningSentAt) return "already_sent";
  return deliverForOrder(db, orderId, data, now);
}

async function deliverForOrder(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  orderId: string,
  data: Record<string, unknown>,
  now: Date,
): Promise<ExpiredWarningOutcome> {
  const preview = toWarningOrder(orderId, data);
  const orders = db.collection(collectionName("orders"));
  const outcome = await deliverExpiredWarning({
    order: preview,
    now,
    loadUser: async (uid) => {
      const userSnap = await db.collection(collectionName("users")).doc(uid).get();
      if (!userSnap.exists) return null;
      const user = userSnap.data() ?? {};
      const email = asString(user.email);
      return {
        email: email || undefined,
        fullName: asString(user.fullName) || undefined,
        isTestAccount: user.isTestAccount === true,
      };
    },
    claim: () => claimExpiry(db, orderId, now),
    markSent: async (sent) => {
      await orders.doc(orderId).update({
        expiredWarningSentAt: Timestamp.fromDate(sent.at),
        expiredWarningSentTo: sent.to,
        expiredWarningMessageId: sent.messageId,
        expiredWarningClaimAt: FieldValue.delete(),
        updatedAt: Timestamp.fromDate(sent.at),
      });
    },
    markSkipped: async (reason, at) => {
      await orders.doc(orderId).update({
        expiredWarningSkippedAt: Timestamp.fromDate(at),
        expiredWarningSkipReason: reason,
        expiredWarningClaimAt: FieldValue.delete(),
        updatedAt: Timestamp.fromDate(at),
      });
    },
    markFailed: async (at, error) => {
      await orders.doc(orderId).update({
        expiredWarningFailedAt: Timestamp.fromDate(at),
        expiredWarningLastError: error.slice(0, 500),
        expiredWarningClaimAt: FieldValue.delete(),
        updatedAt: Timestamp.fromDate(at),
      });
    },
    recordFailure: async (failure) => {
      await db.collection(collectionName("emailFailures")).add({
        kind: failure.kind,
        orderId: failure.orderId,
        runnerUid: failure.runnerUid,
        to: failure.to,
        cc: failure.cc,
        attempts: failure.attempts,
        error: failure.error.slice(0, 500),
        createdAt: Timestamp.fromDate(failure.createdAt),
      });
    },
    send: async (message) => {
      const id = await sendRunnerExpiredWarningEmail(message);
      return { id };
    },
  }).catch((err) => {
    console.error(`expired warning crashed for ${orderId}`, err);
    return { outcome: "failed" as const };
  });
  return outcome.outcome;
}

function tally(summary: ExpireJobSummary, outcome: ExpiredWarningOutcome): void {
  if (outcome === "sent") summary.sent += 1;
  else if (outcome === "failed") summary.failed += 1;
  else if (outcome === "already_sent") summary.alreadySent += 1;
  else if (outcome === "skipped" || outcome === "cancelled") summary.skipped += 1;
}

async function claimExpiry(
  db: NonNullable<ReturnType<typeof getAdminDb>>,
  orderId: string,
  now: Date,
): Promise<
  | { ok: true }
  | {
      ok: false;
      reason:
        | "already_sent"
        | "in_flight"
        | "cancelled"
        | "not_expired"
        | "skipped"
        | "failed_prior"
        | "missing";
    }
> {
  const ref = db.collection(collectionName("orders")).doc(orderId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { ok: false as const, reason: "missing" as const };
    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const order = toWarningOrder(snap.id, data);
    if (order.status === "cancelled") {
      return { ok: false as const, reason: "cancelled" as const };
    }
    const blocked = claimBlocksResend(order, now);
    if (blocked) return { ok: false as const, reason: blocked };
    if (!isRunnerExpiryDue(order, now)) {
      return { ok: false as const, reason: "not_expired" as const };
    }

    const updates: Record<string, unknown> = {
      expiredWarningClaimAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };
    if (!order.runnerExpiredAt) {
      updates.runnerExpiredAt = Timestamp.fromDate(now);
      const current = Number(data.runnerWarningCount);
      updates.runnerWarningCount = (Number.isFinite(current) ? current : 0) + 1;
    }
    tx.update(ref, updates);
    return { ok: true as const };
  });
}
