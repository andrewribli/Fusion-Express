import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPIRED_WARNING_ATTEMPTS,
  EXPIRED_WARNING_CC,
  buildExpiredWarningEmail,
  deliverExpiredWarning,
  isExpiredWarningTestAccount,
  type ExpiredWarningFailure,
  type ExpiredWarningOrder,
} from "./expired-warning";

const CUSTOMER_EMAIL = "customer.student@example.com";
const CUSTOMER_PHONE = "+852 9123 4567";
const LINKED_EMAIL = "linked.runner@my.cityu.edu.hk";
const DISAGREEING_EMAIL = "signup-other@my.cityu.edu.hk";

function order(partial: Partial<ExpiredWarningOrder> = {}): ExpiredWarningOrder {
  const acceptedAt = new Date("2026-09-27T01:00:00.000Z");
  return {
    id: "ord_123",
    status: "accepted",
    runnerUid: "runner-uid",
    runnerName: "Order Name",
    runnerEmail: DISAGREEING_EMAIL,
    customerName: "Jamie Lee",
    customerEmail: CUSTOMER_EMAIL,
    customerPhone: CUSTOMER_PHONE,
    acceptedAt,
    runnerDeadline: new Date(acceptedAt.getTime() + 60_000),
    origin: "Taste, Festival Walk",
    destination: "Hall 2, Lobby A",
    ...partial,
  };
}

function harness(seed: ExpiredWarningOrder) {
  const sends: { to: string; cc: string; subject: string; text: string }[] = [];
  const failures: ExpiredWarningFailure[] = [];
  const logs: string[] = [];
  let sentAt: Date | undefined;
  let skipped = false;
  let failed = false;
  let inFlight = false;
  let tail: Promise<void> = Promise.resolve();

  function exclusive<T>(fn: () => T): Promise<T> {
    const run = tail.then(() => fn());
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  const state = { sentTo: "" as string, messageId: "" as string };

  async function deliver(current = seed) {
    return deliverExpiredWarning({
      order: {
        ...current,
        expiredWarningSentAt: sentAt,
        expiredWarningSkippedAt: skipped ? new Date() : undefined,
        expiredWarningFailedAt: failed ? new Date() : undefined,
        expiredWarningClaimAt: inFlight ? new Date() : undefined,
      },
      now: new Date("2026-09-27T05:00:00.000Z"),
      sleep: async () => undefined,
      logError: (message) => {
        logs.push(message);
      },
      loadUser: async () => ({
        email: LINKED_EMAIL,
        fullName: "Pat Runner",
        isTestAccount: false,
      }),
      claim: () =>
        exclusive(() => {
          if (sentAt) return { ok: false as const, reason: "already_sent" as const };
          if (failed) return { ok: false as const, reason: "failed_prior" as const };
          if (skipped) return { ok: false as const, reason: "skipped" as const };
          if (inFlight) return { ok: false as const, reason: "in_flight" as const };
          if (current.status === "cancelled") {
            return { ok: false as const, reason: "cancelled" as const };
          }
          inFlight = true;
          return { ok: true as const };
        }),
      markSent: (sent) =>
        exclusive(() => {
          sentAt = sent.at;
          state.sentTo = sent.to;
          state.messageId = sent.messageId;
          inFlight = false;
        }),
      markSkipped: () =>
        exclusive(() => {
          skipped = true;
          inFlight = false;
        }),
      markFailed: () =>
        exclusive(() => {
          failed = true;
          inFlight = false;
        }),
      recordFailure: async (failure) => {
        failures.push(failure);
      },
      send: async (message) => {
        sends.push(message);
        await new Promise((resolve) => setTimeout(resolve, 15));
        return { id: "resend_msg_1" };
      },
    });
  }

  return { deliver, sends, failures, logs, state };
}

test("sends once to the runner user-doc email, CCs Andrew, and does not send again", async () => {
  const { deliver, sends, state } = harness(order());
  const first = await deliver();
  assert.equal(first.outcome, "sent");
  assert.equal(sends.length, 1);
  assert.equal(sends[0].to, LINKED_EMAIL);
  assert.equal(sends[0].cc, EXPIRED_WARNING_CC);
  assert.notEqual(sends[0].to, DISAGREEING_EMAIL);
  assert.equal(state.sentTo, LINKED_EMAIL);
  assert.equal(state.messageId, "resend_msg_1");
  assert.equal(
    sends[0].subject,
    "Warning: Your GraceRun delivery expired — Order #ord_123",
  );
  assert.match(sends[0].text, /Hi Pat Runner,/);
  assert.match(sends[0].text, /Picked up from: Taste, Festival Walk/);
  assert.match(sends[0].text, /Customer: Jamie Lee/);
  assert.match(sends[0].text, /hello@gracerun\.fit/);
  assert.equal(sends[0].text.includes(CUSTOMER_EMAIL), false);
  assert.equal(sends[0].text.includes(CUSTOMER_PHONE), false);
  assert.equal(sends[0].text.includes(DISAGREEING_EMAIL), false);
  assert.equal(sends[0].subject.includes(CUSTOMER_EMAIL), false);

  const second = await deliver();
  assert.equal(second.outcome, "already_sent");
  assert.equal(sends.length, 1);
});

test("concurrent calls send a single email", async () => {
  const { deliver, sends } = harness(order());
  const [a, b] = await Promise.all([deliver(), deliver()]);
  const outcomes = [a.outcome, b.outcome].sort();
  assert.deepEqual(outcomes, ["in_flight", "sent"]);
  assert.equal(sends.length, 1);
  assert.equal(sends[0].to, LINKED_EMAIL);
  assert.equal(sends[0].cc, EXPIRED_WARNING_CC);
});

test("does not email cancelled deliveries or the customer", async () => {
  const { deliver, sends } = harness(order({ status: "cancelled" }));
  const result = await deliver();
  assert.equal(result.outcome, "cancelled");
  assert.equal(sends.length, 0);
});

test("skips demo and isTestAccount runners without sending", async () => {
  for (const email of ["runner@my.cityu.edu.hk", "demo@my.cityu.edu.hk"]) {
    assert.equal(isExpiredWarningTestAccount({ email }), true);
  }
  assert.equal(
    isExpiredWarningTestAccount({
      email: LINKED_EMAIL,
      isTestAccount: true,
    }),
    true,
  );

  const sends: unknown[] = [];
  const result = await deliverExpiredWarning({
    order: order(),
    now: new Date("2026-09-27T05:00:00.000Z"),
    sleep: async () => undefined,
    loadUser: async () => ({
      email: "runner@my.cityu.edu.hk",
      fullName: "Demo",
    }),
    claim: async () => ({ ok: true }),
    markSent: async () => undefined,
    markSkipped: async () => undefined,
    markFailed: async () => undefined,
    recordFailure: async () => undefined,
    send: async (message) => {
      sends.push(message);
      return { id: "should-not-send" };
    },
  });
  assert.equal(result.outcome, "skipped");
  assert.equal(result.reason, "test_account");
  assert.equal(sends.length, 0);
});

test("logs and skips when the user doc has no email", async () => {
  const logs: string[] = [];
  const sends: unknown[] = [];
  const result = await deliverExpiredWarning({
    order: order(),
    now: new Date("2026-09-27T05:00:00.000Z"),
    sleep: async () => undefined,
    logError: (message) => logs.push(message),
    loadUser: async () => ({ fullName: "Pat", email: "  " }),
    claim: async () => ({ ok: true }),
    markSent: async () => undefined,
    markSkipped: async () => undefined,
    markFailed: async () => undefined,
    recordFailure: async () => undefined,
    send: async (message) => {
      sends.push(message);
      return { id: "nope" };
    },
  });
  assert.equal(result.reason, "missing_email");
  assert.equal(sends.length, 0);
  assert.equal(logs.length, 1);
});

test("retries three times then records one emailFailures doc and does not send again", async () => {
  let attempts = 0;
  const failureDocs: ExpiredWarningFailure[] = [];
  let failed = false;
  const result = await deliverExpiredWarning({
    order: order(),
    now: new Date("2026-09-27T05:00:00.000Z"),
    sleep: async () => undefined,
    loadUser: async () => ({ email: LINKED_EMAIL, fullName: "Pat Runner" }),
    claim: async () => {
      if (failed) return { ok: false, reason: "failed_prior" };
      return { ok: true };
    },
    markSent: async () => undefined,
    markSkipped: async () => undefined,
    markFailed: async () => {
      failed = true;
    },
    recordFailure: async (failure) => {
      failureDocs.push(failure);
    },
    send: async () => {
      attempts += 1;
      throw new Error("resend down");
    },
  });
  assert.equal(result.outcome, "failed");
  assert.equal(attempts, EXPIRED_WARNING_ATTEMPTS);
  assert.equal(EXPIRED_WARNING_ATTEMPTS, 4);
  assert.equal(failureDocs.length, 1);
  assert.equal(failureDocs[0].to, LINKED_EMAIL);
  assert.equal(failureDocs[0].cc, EXPIRED_WARNING_CC);
  assert.equal(failureDocs[0].error.includes(CUSTOMER_EMAIL), false);
  assert.equal(failureDocs[0].kind, "runner_expired_warning");

  const again = await deliverExpiredWarning({
    order: order(),
    now: new Date("2026-09-27T05:00:00.000Z"),
    sleep: async () => undefined,
    loadUser: async () => ({ email: LINKED_EMAIL, fullName: "Pat Runner" }),
    claim: async () => ({ ok: false, reason: "failed_prior" }),
    markSent: async () => undefined,
    markSkipped: async () => undefined,
    markFailed: async () => undefined,
    recordFailure: async () => {
      failureDocs.push({
        kind: "runner_expired_warning",
        orderId: "ord_123",
        runnerUid: "runner-uid",
        to: LINKED_EMAIL,
        cc: EXPIRED_WARNING_CC,
        attempts: 4,
        error: "should not record twice",
        createdAt: new Date(),
      });
    },
    send: async () => {
      attempts += 1;
      return { id: "nope" };
    },
  });
  assert.equal(again.outcome, "skipped");
  assert.equal(attempts, EXPIRED_WARNING_ATTEMPTS);
  assert.equal(failureDocs.length, 1);
});

test("body stays professional and does not threaten a ban", () => {
  const { subject, text } = buildExpiredWarningEmail({
    orderId: "ord_9",
    runnerName: "Pat",
    origin: "Fusion supermarket",
    destination: "Shaw, Lobby",
    acceptedAt: "27 Sep 2026, 9:00 am",
    expiredAt: "27 Sep 2026, 12:00 pm",
    customerName: "Jamie",
  });
  assert.equal(subject, "Warning: Your GraceRun delivery expired — Order #ord_9");
  assert.match(text, /GraceRun/);
  assert.equal(/ban|fine|removed/i.test(text), false);
});
