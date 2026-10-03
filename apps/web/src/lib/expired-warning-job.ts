import "server-only";
import { supermarketPickupLocation } from "@fusion-express/shared/campus";
import { collectionName } from "@/lib/constants";
import { getCanteenMeta } from "@/lib/canteenConfig";
import { GROCERY_SOURCES } from "@/lib/grocerySources";
import { sendRunnerExpiredWarningEmail } from "@/lib/email";
import { adminAccessToken } from "@/lib/firestore-rest";
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
];

type RestField =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { nullValue: null };

type RestDoc = {
  id: string;
  updateTime?: string;
  data: Record<string, unknown>;
};

type RestCtx = { token: string; project: string };

function documentsBase(project: string): string {
  return `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
}

function decodeValue(value: RestField | undefined): unknown {
  if (!value) return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return new Date(value.timestampValue);
  if ("nullValue" in value) return null;
  return undefined;
}

function decodeFields(
  fields: Record<string, RestField> | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields ?? {})) {
    out[key] = decodeValue(value);
  }
  return out;
}

function docIdFromName(name: string): string {
  const parts = name.split("/");
  return decodeURIComponent(parts[parts.length - 1] ?? "");
}

function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function timestampField(date: Date): RestField {
  return { timestampValue: date.toISOString() };
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

function toWarningOrder(id: string, data: Record<string, unknown>): ExpiredWarningOrder {
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

async function readDoc(
  ctx: RestCtx,
  collection: string,
  id: string,
): Promise<RestDoc | null> {
  const res = await fetch(
    `${documentsBase(ctx.project)}/${collection}/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${ctx.token}` } },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error("expired warning read failed", collection, id, res.status);
    throw new Error("Could not read Firestore.");
  }
  const body = (await res.json()) as {
    name?: string;
    updateTime?: string;
    fields?: Record<string, RestField>;
  };
  return {
    id: body.name ? docIdFromName(body.name) : id,
    updateTime: body.updateTime,
    data: decodeFields(body.fields),
  };
}

async function patchDoc(
  ctx: RestCtx,
  collection: string,
  id: string,
  fields: Record<string, RestField>,
  updateTime: string | undefined,
  deleteFields: string[] = [],
): Promise<"ok" | "conflict"> {
  const params = new URLSearchParams();
  for (const path of [...Object.keys(fields), ...deleteFields]) {
    params.append("updateMask.fieldPaths", path);
  }
  if (updateTime) params.set("currentDocument.updateTime", updateTime);
  const res = await fetch(
    `${documentsBase(ctx.project)}/${collection}/${encodeURIComponent(id)}?${params}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${ctx.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    },
  );
  if (res.status === 409 || res.status === 412) return "conflict";
  if (!res.ok) {
    const text = await res.text();
    console.error("expired warning write failed", id, res.status, text.slice(0, 400));
    throw new Error("Could not update order.");
  }
  return "ok";
}

async function listOpenOrders(ctx: RestCtx): Promise<RestDoc[]> {
  const res = await fetch(
    `${documentsBase(ctx.project)}:runQuery`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ctx.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionName("orders") }],
          where: {
            fieldFilter: {
              field: { fieldPath: "status" },
              op: "IN",
              value: {
                arrayValue: {
                  values: OPEN_STATUSES.map((status) => ({ stringValue: status })),
                },
              },
            },
          },
          limit: 300,
        },
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    console.error("expired warning query failed", res.status, text.slice(0, 400));
    throw new Error("Could not list open orders.");
  }
  const rows = (await res.json()) as {
    document?: {
      name?: string;
      updateTime?: string;
      fields?: Record<string, RestField>;
    };
  }[];
  return rows.flatMap((row) => {
    if (!row.document?.name) return [];
    return [
      {
        id: docIdFromName(row.document.name),
        updateTime: row.document.updateTime,
        data: decodeFields(row.document.fields),
      },
    ];
  });
}

export type ExpireJobSummary = {
  considered: number;
  sent: number;
  skipped: number;
  failed: number;
  alreadySent: number;
};

/** Server path that stamps runnerExpiredAt and emails the runner once. Never throws. */
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
  const ctx = await adminAccessToken();
  if (!ctx) {
    console.error("expire deliveries: Firestore admin token is unavailable");
    return summary;
  }
  const rows = await listOpenOrders(ctx);
  for (const row of rows) {
    const preview = toWarningOrder(row.id, row.data);
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
    tally(summary, await deliverForOrder(ctx, row.id, now));
  }
  return summary;
}

/** Persist expiry and send the one-time warning for a single order. Never throws. */
export async function warnExpiredOrderById(
  orderId: string,
  now = new Date(),
): Promise<ExpiredWarningOutcome> {
  const ctx = await adminAccessToken();
  if (!ctx) {
    console.error("expire deliveries: Firestore admin token is unavailable");
    return "missing";
  }
  const row = await readDoc(ctx, collectionName("orders"), orderId);
  if (!row) return "missing";
  const preview = toWarningOrder(orderId, row.data);
  if (preview.status === "cancelled") return "cancelled";
  if (!isRunnerExpiryDue(preview, now)) return "not_expired";
  if (preview.expiredWarningSentAt) return "already_sent";
  return deliverForOrder(ctx, orderId, now);
}

async function deliverForOrder(
  ctx: RestCtx,
  orderId: string,
  now: Date,
): Promise<ExpiredWarningOutcome> {
  const orders = collectionName("orders");
  const current = await readDoc(ctx, orders, orderId);
  if (!current) return "missing";
  const preview = toWarningOrder(orderId, current.data);
  const outcome = await deliverExpiredWarning({
    order: preview,
    now,
    loadUser: async (uid) => {
      const user = await readDoc(ctx, collectionName("users"), uid);
      if (!user) return null;
      const email = asString(user.data.email);
      return {
        email: email || undefined,
        fullName: asString(user.data.fullName) || undefined,
        isTestAccount: user.data.isTestAccount === true,
      };
    },
    claim: () => claimExpiry(ctx, orderId, now),
    markSent: async (sent) => {
      const fresh = await readDoc(ctx, orders, orderId);
      await patchDoc(
        ctx,
        orders,
        orderId,
        {
          expiredWarningSentAt: timestampField(sent.at),
          expiredWarningSentTo: { stringValue: sent.to },
          expiredWarningMessageId: { stringValue: sent.messageId },
          updatedAt: timestampField(sent.at),
        },
        fresh?.updateTime,
        ["expiredWarningClaimAt"],
      );
    },
    markSkipped: async (reason, at) => {
      const fresh = await readDoc(ctx, orders, orderId);
      await patchDoc(
        ctx,
        orders,
        orderId,
        {
          expiredWarningSkippedAt: timestampField(at),
          expiredWarningSkipReason: { stringValue: reason },
          updatedAt: timestampField(at),
        },
        fresh?.updateTime,
        ["expiredWarningClaimAt"],
      );
    },
    markFailed: async (at, error) => {
      const fresh = await readDoc(ctx, orders, orderId);
      await patchDoc(
        ctx,
        orders,
        orderId,
        {
          expiredWarningFailedAt: timestampField(at),
          expiredWarningLastError: { stringValue: error.slice(0, 500) },
          updatedAt: timestampField(at),
        },
        fresh?.updateTime,
        ["expiredWarningClaimAt"],
      );
    },
    recordFailure: async (failure) => {
      const res = await fetch(
        `${documentsBase(ctx.project)}/${collectionName("emailFailures")}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ctx.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: {
              kind: { stringValue: failure.kind },
              orderId: { stringValue: failure.orderId },
              runnerUid: { stringValue: failure.runnerUid },
              to: { stringValue: failure.to },
              cc: { stringValue: failure.cc },
              attempts: { integerValue: String(failure.attempts) },
              error: { stringValue: failure.error.slice(0, 500) },
              createdAt: timestampField(failure.createdAt),
            },
          }),
        },
      );
      if (!res.ok) {
        console.error("emailFailures write failed", res.status, (await res.text()).slice(0, 300));
      }
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
  ctx: RestCtx,
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
  const orders = collectionName("orders");
  const row = await readDoc(ctx, orders, orderId);
  if (!row) return { ok: false, reason: "missing" };
  const order = toWarningOrder(row.id, row.data);
  if (order.status === "cancelled") return { ok: false, reason: "cancelled" };
  const blocked = claimBlocksResend(order, now);
  if (blocked) return { ok: false, reason: blocked };
  if (!isRunnerExpiryDue(order, now)) return { ok: false, reason: "not_expired" };

  const fields: Record<string, RestField> = {
    expiredWarningClaimAt: timestampField(now),
    updatedAt: timestampField(now),
  };
  if (!order.runnerExpiredAt) {
    fields.runnerExpiredAt = timestampField(now);
    const current = Number(row.data.runnerWarningCount);
    fields.runnerWarningCount = {
      integerValue: String((Number.isFinite(current) ? current : 0) + 1),
    };
  }
  const wrote = await patchDoc(ctx, orders, orderId, fields, row.updateTime);
  if (wrote === "conflict") return { ok: false, reason: "in_flight" };
  return { ok: true };
}
