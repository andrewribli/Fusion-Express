/**
 * One-time founder welcome email after account creation.
 * Pure orchestration — Resend / Firestore are injected for tests.
 */

import { isDoNotEmailAddress } from "@fusion-express/shared/demo-account";

export const WELCOME_EMAIL_SUBJECT = "saw you just made an account 👋";

/** Founder voice — keep in sync with Messaging → New Users default. */
export const WELCOME_EMAIL_BODY = `Hey there! 👋

Saw you just made an account, welcome.

I hope this semester's a good one for you 📚 Study hard, spend quality time with the people you care about, and use GraceRun however it helps. Whether that's saving yourself a walk, or helping someone else save theirs by becoming a runner.

If you ever encounter any issues, don't hesitate to contact us through phone or admin chat 🙏 I read every message myself.

📞 +852-95181085
📧 hello@gracerun.fit

All the best,
Andrew

---

Don't want emails from me? Reply "stop" and I'll take you off
the list. No hard feelings.`;

export const WELCOME_EMAIL_FROM = "Andrew <hello@gracerun.fit>";
export const WELCOME_EMAIL_REPLY_TO = "hello@gracerun.fit";

/** Initial attempt plus three retries (1s, 4s, 16s between failures). */
export const WELCOME_EMAIL_ATTEMPTS = 4;
export const WELCOME_EMAIL_BACKOFF_MS = [1000, 4000, 16000] as const;

/** Demo logins that must never receive a welcome email. */
export const WELCOME_EMAIL_TEST_EMAILS = [
  "runner@my.cityu.edu.hk",
  "demo@my.cityu.edu.hk",
  "demo@gracerun.fit",
] as const;

export type WelcomeEmailUser = {
  uid: string;
  email?: string | null;
  isTestAccount?: boolean;
  isGuest?: boolean;
  welcomeEmailSentAt?: Date | null;
  welcomeEmailStatus?: string | null;
};

export type WelcomeEmailFailure = {
  kind: "welcome_email";
  userId: string;
  to: string;
  attempts: number;
  error: string;
  createdAt: Date;
};

export type WelcomeEmailOutcome =
  | "sent"
  | "already_sent"
  | "skipped"
  | "failed";

export function isWelcomeEmailTestAccount(user: {
  email?: string | null;
  isTestAccount?: boolean;
}): boolean {
  if (user.isTestAccount === true) return true;
  if (isDoNotEmailAddress(user.email)) return true;
  const email = user.email?.trim().toLowerCase() ?? "";
  return (WELCOME_EMAIL_TEST_EMAILS as readonly string[]).includes(email);
}

export function buildWelcomeEmailText(): {
  subject: string;
  text: string;
} {
  return {
    subject: WELCOME_EMAIL_SUBJECT,
    text: WELCOME_EMAIL_BODY,
  };
}

async function sendWithRetry(
  send: () => Promise<{ id: string }>,
  sleep: (ms: number) => Promise<void>,
): Promise<{ id: string }> {
  let last: unknown;
  for (let attempt = 1; attempt <= WELCOME_EMAIL_ATTEMPTS; attempt++) {
    try {
      const result = await send();
      if (!result?.id) throw new Error("Resend did not return a message id");
      return result;
    } catch (err) {
      last = err;
      if (attempt === WELCOME_EMAIL_ATTEMPTS) break;
      const delay = WELCOME_EMAIL_BACKOFF_MS[attempt - 1] ?? 16000;
      await sleep(delay);
    }
  }
  const messageText =
    last instanceof Error ? last.message : "Could not send welcome email";
  throw new Error(messageText);
}

export async function deliverWelcomeEmail(opts: {
  user: WelcomeEmailUser;
  now?: Date;
  send: (message: {
    to: string;
    subject: string;
    text: string;
  }) => Promise<{ id: string }>;
  markSent: (sent: {
    at: Date;
    messageId: string;
  }) => Promise<void>;
  markFailed: (at: Date, error: string) => Promise<void>;
  recordFailure: (failure: WelcomeEmailFailure) => Promise<void>;
  sleep?: (ms: number) => Promise<void>;
  logError?: (message: string, detail?: unknown) => void;
}): Promise<{ outcome: WelcomeEmailOutcome; reason?: string; messageId?: string }> {
  const now = opts.now ?? new Date();
  const logError =
    opts.logError ?? ((message, detail) => console.error(message, detail));
  const sleep =
    opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const user = opts.user;

  if (user.welcomeEmailSentAt) {
    return { outcome: "already_sent" };
  }
  if (user.welcomeEmailStatus === "sent") {
    return { outcome: "already_sent" };
  }

  if (user.isGuest === true) {
    return { outcome: "skipped", reason: "guest" };
  }

  const to = user.email?.trim().toLowerCase() ?? "";
  if (!to || !to.includes("@")) {
    console.log(
      `welcome email skipped: user ${user.uid} has no email on account`,
    );
    return { outcome: "skipped", reason: "missing_email" };
  }

  if (isWelcomeEmailTestAccount(user)) {
    return { outcome: "skipped", reason: "test_account" };
  }

  const { subject, text } = buildWelcomeEmailText();

  try {
    const sent = await sendWithRetry(
      () => opts.send({ to, subject, text }),
      sleep,
    );
    await opts.markSent({ at: now, messageId: sent.id });
    return { outcome: "sent", messageId: sent.id };
  } catch (err) {
    const error =
      err instanceof Error ? err.message : "Could not send welcome email";
    logError(`welcome email failed for ${user.uid}`, err);
    try {
      await opts.markFailed(now, error);
    } catch (markErr) {
      logError("welcomeEmailStatus failed write", markErr);
    }
    try {
      await opts.recordFailure({
        kind: "welcome_email",
        userId: user.uid,
        to,
        attempts: WELCOME_EMAIL_ATTEMPTS,
        error,
        createdAt: now,
      });
    } catch (failErr) {
      logError("emailFailures write failed for welcome", failErr);
    }
    return { outcome: "failed", reason: error };
  }
}
