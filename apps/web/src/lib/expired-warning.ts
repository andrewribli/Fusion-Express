/**
 * One warning email when a runner's delivery expires.
 * Pure orchestration: Firestore and Resend are injected so tests can dry-run.
 */

export const EXPIRED_WARNING_CC = "andrew.ribli@gmail.com";

/**
 * Demo logins that must never receive this warning.
 * Checked in code only — do not write isTestAccount across Firestore.
 */
export const EXPIRED_WARNING_TEST_EMAILS = [
  "runner@my.cityu.edu.hk",
  "demo@my.cityu.edu.hk",
] as const;

/** Initial attempt plus three retries. */
export const EXPIRED_WARNING_ATTEMPTS = 4;

const CLAIM_TTL_MS = 2 * 60 * 1000;
const RUNNER_DELIVERY_WINDOW_MS = 3 * 60 * 60 * 1000;

const OPEN_DELIVERY_STATUSES = new Set([
  "accepted",
  "purchased",
  "receipt_uploaded",
  "assigned",
  "picked",
  "expired",
]);

export type ExpiredWarningUser = {
  email?: string;
  fullName?: string;
  isTestAccount?: boolean;
};

export type ExpiredWarningOrder = {
  id: string;
  status: string;
  runnerUid?: string;
  runnerName?: string;
  /** Present on the order doc. Never used as the recipient. */
  runnerEmail?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  acceptedAt?: Date;
  runnerDeadline?: Date;
  runnerExpiredAt?: Date;
  expiredWarningSentAt?: Date;
  expiredWarningClaimAt?: Date;
  expiredWarningSkippedAt?: Date;
  expiredWarningFailedAt?: Date;
  origin: string;
  destination: string;
};

export type ExpiredWarningFailure = {
  kind: "runner_expired_warning";
  orderId: string;
  runnerUid: string;
  to: string;
  cc: string;
  attempts: number;
  error: string;
  createdAt: Date;
};

export type ExpiredWarningOutcome =
  | "sent"
  | "already_sent"
  | "in_flight"
  | "skipped"
  | "failed"
  | "not_expired"
  | "cancelled"
  | "missing";

export function isExpiredWarningTestAccount(user: {
  email?: string | null;
  isTestAccount?: boolean;
}): boolean {
  if (user.isTestAccount === true) return true;
  const email = user.email?.trim().toLowerCase() ?? "";
  return (EXPIRED_WARNING_TEST_EMAILS as readonly string[]).includes(email);
}

export function runnerDeliveryDue(order: {
  runnerDeadline?: Date;
  acceptedAt?: Date;
}): Date | undefined {
  if (order.runnerDeadline) return order.runnerDeadline;
  if (order.acceptedAt) {
    return new Date(order.acceptedAt.getTime() + RUNNER_DELIVERY_WINDOW_MS);
  }
  return undefined;
}

/** Open delivery whose 3-hour window has passed, or already stamped expired. */
export function isRunnerExpiryDue(
  order: {
    status: string;
    runnerDeadline?: Date;
    acceptedAt?: Date;
    runnerExpiredAt?: Date;
  },
  now: Date,
): boolean {
  if (order.status === "cancelled") return false;
  if (!OPEN_DELIVERY_STATUSES.has(order.status)) return false;
  if (order.status === "expired" || order.runnerExpiredAt) return true;
  const due = runnerDeliveryDue(order);
  return Boolean(due && now.getTime() >= due.getTime());
}

export function safeCustomerName(name?: string | null): string {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "Customer";
  if (trimmed.includes("@")) return "Customer";
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length >= 8 && /^[+\d\s().-]+$/.test(trimmed)) return "Customer";
  return trimmed;
}

export function formatWarningInstant(date: Date): string {
  return new Intl.DateTimeFormat("en-HK", {
    timeZone: "Asia/Hong_Kong",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function buildExpiredWarningEmail(input: {
  orderId: string;
  runnerName: string;
  origin: string;
  destination: string;
  acceptedAt: string;
  expiredAt: string;
  customerName: string;
}): { subject: string; text: string } {
  const orderId = oneLine(input.orderId) || "unknown";
  const subject = `Warning: Your GraceRun delivery expired — Order #${orderId}`;
  const text = `Hi ${oneLine(input.runnerName) || "there"},

Your delivery for Order #${orderId} has been marked as expired.

Order details:
- Picked up from: ${oneLine(input.origin) || "—"}
- Delivering to: ${oneLine(input.destination) || "—"}
- Accepted at: ${oneLine(input.acceptedAt) || "—"}
- Expired at: ${oneLine(input.expiredAt) || "—"}
- Customer: ${safeCustomerName(input.customerName)}

This order is no longer your active delivery. If this was a mistake or you had an issue, reply to this email or contact us at hello@gracerun.fit.

Thanks,
Andrew
GraceRun`;
  return { subject, text };
}

export function claimBlocksResend(order: {
  expiredWarningSentAt?: Date;
  expiredWarningSkippedAt?: Date;
  expiredWarningFailedAt?: Date;
  expiredWarningClaimAt?: Date;
}, now: Date): "already_sent" | "skipped" | "failed_prior" | "in_flight" | null {
  if (order.expiredWarningSentAt) return "already_sent";
  if (order.expiredWarningSkippedAt) return "skipped";
  if (order.expiredWarningFailedAt) return "failed_prior";
  if (
    order.expiredWarningClaimAt &&
    now.getTime() - order.expiredWarningClaimAt.getTime() < CLAIM_TTL_MS
  ) {
    return "in_flight";
  }
  return null;
}

type ClaimResult =
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
    };

async function sendWithRetry(
  send: (message: {
    to: string;
    cc: string;
    subject: string;
    text: string;
  }) => Promise<{ id: string }>,
  message: { to: string; cc: string; subject: string; text: string },
  sleep: (ms: number) => Promise<void>,
): Promise<{ id: string }> {
  let last: unknown;
  for (let attempt = 1; attempt <= EXPIRED_WARNING_ATTEMPTS; attempt++) {
    try {
      const result = await send(message);
      if (!result?.id) throw new Error("Resend did not return a message id");
      return result;
    } catch (err) {
      last = err;
      if (attempt === EXPIRED_WARNING_ATTEMPTS) break;
      await sleep(200 * 2 ** (attempt - 1));
    }
  }
  const messageText =
    last instanceof Error ? last.message : "Could not send expired warning";
  throw new Error(messageText);
}

export async function deliverExpiredWarning(opts: {
  order: ExpiredWarningOrder;
  now?: Date;
  loadUser: (uid: string) => Promise<ExpiredWarningUser | null>;
  /** Persists expiry and a claim. Must be atomic under concurrent calls. */
  claim: () => Promise<ClaimResult>;
  markSent: (sent: { at: Date; to: string; messageId: string }) => Promise<void>;
  markSkipped: (reason: string, at: Date) => Promise<void>;
  markFailed: (at: Date, error: string) => Promise<void>;
  recordFailure: (failure: ExpiredWarningFailure) => Promise<void>;
  send: (message: {
    to: string;
    cc: string;
    subject: string;
    text: string;
  }) => Promise<{ id: string }>;
  sleep?: (ms: number) => Promise<void>;
  logError?: (message: string, detail?: unknown) => void;
}): Promise<{ outcome: ExpiredWarningOutcome; reason?: string }> {
  const now = opts.now ?? new Date();
  const logError = opts.logError ?? ((message, detail) => console.error(message, detail));
  const sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const order = opts.order;

  if (order.status === "cancelled") {
    return { outcome: "cancelled" };
  }
  if (!isRunnerExpiryDue(order, now)) {
    return { outcome: "not_expired" };
  }

  const claimed = await opts.claim();
  if (!claimed.ok) {
    if (claimed.reason === "already_sent") return { outcome: "already_sent" };
    if (claimed.reason === "in_flight") return { outcome: "in_flight" };
    if (claimed.reason === "cancelled") return { outcome: "cancelled" };
    if (claimed.reason === "failed_prior" || claimed.reason === "skipped") {
      return { outcome: "skipped", reason: claimed.reason };
    }
    return { outcome: claimed.reason === "missing" ? "missing" : "not_expired" };
  }

  const runnerUid = order.runnerUid?.trim() ?? "";
  if (!runnerUid) {
    logError(`expired warning skipped: order ${order.id} has no runner uid`);
    await opts.markSkipped("missing_runner", now);
    return { outcome: "skipped", reason: "missing_runner" };
  }

  const user = await opts.loadUser(runnerUid);
  const recipient = user?.email?.trim() ?? "";
  if (!user || !recipient) {
    logError(
      `expired warning skipped: runner ${runnerUid} user doc has no email`,
      { orderId: order.id },
    );
    await opts.markSkipped("missing_email", now);
    return { outcome: "skipped", reason: "missing_email" };
  }

  if (isExpiredWarningTestAccount(user)) {
    await opts.markSkipped("test_account", now);
    return { outcome: "skipped", reason: "test_account" };
  }

  const runnerName = user.fullName?.trim() || order.runnerName?.trim() || "there";
  const expiredAt = order.runnerExpiredAt ?? now;
  const message = buildExpiredWarningEmail({
    orderId: order.id,
    runnerName,
    origin: order.origin,
    destination: order.destination,
    acceptedAt: order.acceptedAt ? formatWarningInstant(order.acceptedAt) : "Not recorded",
    expiredAt: formatWarningInstant(expiredAt),
    customerName: safeCustomerName(order.customerName),
  });
  const cc = EXPIRED_WARNING_CC;

  try {
    const sent = await sendWithRetry(
      opts.send,
      { to: recipient, cc, subject: message.subject, text: message.text },
      sleep,
    );
    await opts.markSent({ at: now, to: recipient, messageId: sent.id });
    return { outcome: "sent" };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Could not send expired warning";
    logError(`expired warning failed for order ${order.id}`, error);
    try {
      await opts.markFailed(now, error);
      await opts.recordFailure({
        kind: "runner_expired_warning",
        orderId: order.id,
        runnerUid,
        to: recipient,
        cc,
        attempts: EXPIRED_WARNING_ATTEMPTS,
        error,
        createdAt: now,
      });
    } catch (writeErr) {
      logError(`expired warning failure record failed for order ${order.id}`, writeErr);
    }
    return { outcome: "failed" };
  }
}

export { CLAIM_TTL_MS };
