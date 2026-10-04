import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  WELCOME_EMAIL_ATTEMPTS,
  WELCOME_EMAIL_BACKOFF_MS,
  WELCOME_EMAIL_BODY,
  WELCOME_EMAIL_SUBJECT,
  buildWelcomeEmailText,
  deliverWelcomeEmail,
  isWelcomeEmailTestAccount,
} from "./welcome-email";

describe("welcome email template", () => {
  it("matches the founder subject and plain-text body exactly", () => {
    const built = buildWelcomeEmailText();
    assert.equal(built.subject, "saw you just made an account 👋");
    assert.equal(built.text, WELCOME_EMAIL_BODY);
    assert.equal(built.subject, WELCOME_EMAIL_SUBJECT);
    assert.match(built.text, /All the best,\nAndrew/);
    assert.match(built.text, /\+852-95181085/);
    assert.match(built.text, /hello@gracerun\.fit/);
    assert.match(built.text, /becoming a runner/);
    assert.match(
      built.text,
      /Don't want emails from me\? Reply "stop" and I'll take you off/,
    );
    assert.ok(!built.text.includes("<html"));
    assert.ok(!built.text.includes("<a "));
  });
});

describe("isWelcomeEmailTestAccount", () => {
  it("skips flagged and demo emails", () => {
    assert.equal(isWelcomeEmailTestAccount({ isTestAccount: true }), true);
    assert.equal(
      isWelcomeEmailTestAccount({ email: "demo@gracerun.fit" }),
      true,
    );
    assert.equal(
      isWelcomeEmailTestAccount({ email: "student@link.cuhk.edu.hk" }),
      false,
    );
  });
});

describe("deliverWelcomeEmail", () => {
  it("is idempotent when welcomeEmailSentAt is set", async () => {
    let sends = 0;
    const result = await deliverWelcomeEmail({
      user: {
        uid: "u1",
        email: "a@link.cuhk.edu.hk",
        welcomeEmailSentAt: new Date(),
      },
      send: async () => {
        sends += 1;
        return { id: "should-not" };
      },
      markSent: async () => undefined,
      markFailed: async () => undefined,
      recordFailure: async () => undefined,
      sleep: async () => undefined,
    });
    assert.equal(result.outcome, "already_sent");
    assert.equal(sends, 0);
  });

  it("skips missing email without failing", async () => {
    const result = await deliverWelcomeEmail({
      user: { uid: "u2", email: null },
      send: async () => ({ id: "x" }),
      markSent: async () => undefined,
      markFailed: async () => undefined,
      recordFailure: async () => undefined,
    });
    assert.equal(result.outcome, "skipped");
    assert.equal(result.reason, "missing_email");
  });

  it("skips guests", async () => {
    const result = await deliverWelcomeEmail({
      user: { uid: "u3", email: "g@link.cuhk.edu.hk", isGuest: true },
      send: async () => ({ id: "x" }),
      markSent: async () => undefined,
      markFailed: async () => undefined,
      recordFailure: async () => undefined,
    });
    assert.equal(result.outcome, "skipped");
    assert.equal(result.reason, "guest");
  });

  it("sends once and stamps message id", async () => {
    const marks: string[] = [];
    const result = await deliverWelcomeEmail({
      user: { uid: "u4", email: "new@my.cityu.edu.hk" },
      send: async ({ to, subject, text }) => {
        assert.equal(to, "new@my.cityu.edu.hk");
        assert.equal(subject, WELCOME_EMAIL_SUBJECT);
        assert.equal(text, WELCOME_EMAIL_BODY);
        return { id: "re_welcome_1" };
      },
      markSent: async ({ messageId }) => {
        marks.push(messageId);
      },
      markFailed: async () => undefined,
      recordFailure: async () => undefined,
      sleep: async () => undefined,
    });
    assert.equal(result.outcome, "sent");
    assert.equal(result.messageId, "re_welcome_1");
    assert.deepEqual(marks, ["re_welcome_1"]);
  });

  it("retries then records emailFailures without throwing", async () => {
    let attempts = 0;
    const failures: { userId: string; attempts: number }[] = [];
    let failedStatus = "";
    const delays: number[] = [];
    const result = await deliverWelcomeEmail({
      user: { uid: "u5", email: "fail@link.cuhk.edu.hk" },
      send: async () => {
        attempts += 1;
        throw new Error("Resend down");
      },
      markSent: async () => undefined,
      markFailed: async (_at, error) => {
        failedStatus = error;
      },
      recordFailure: async (failure) => {
        failures.push({
          userId: failure.userId,
          attempts: failure.attempts,
        });
      },
      sleep: async (ms) => {
        delays.push(ms);
      },
    });
    assert.equal(result.outcome, "failed");
    assert.equal(attempts, WELCOME_EMAIL_ATTEMPTS);
    assert.deepEqual(delays, [...WELCOME_EMAIL_BACKOFF_MS]);
    assert.match(failedStatus, /Resend down/);
    assert.deepEqual(failures, [
      { userId: "u5", attempts: WELCOME_EMAIL_ATTEMPTS },
    ]);
  });
});
