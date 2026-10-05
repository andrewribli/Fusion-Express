import "server-only";
import { Resend } from "resend";
import { collectionName } from "@/lib/constants";
import {
  createAdminDocumentRest,
  getAdminDocumentRest,
  patchAdminDocumentRest,
} from "@/lib/firestore-rest";
import {
  deliverWelcomeEmail,
  WELCOME_EMAIL_FROM,
  WELCOME_EMAIL_REPLY_TO,
  type WelcomeEmailUser,
} from "@/lib/welcome-email";

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  return new Resend(apiKey);
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function userFromDoc(
  uid: string,
  data: Record<string, unknown> | null,
  fallbackEmail: string | null,
): WelcomeEmailUser {
  const email =
    (typeof data?.email === "string" ? data.email : null)?.trim().toLowerCase() ||
    fallbackEmail?.trim().toLowerCase() ||
    null;
  return {
    uid,
    email,
    isTestAccount: data?.isTestAccount === true,
    isGuest: data?.isGuest === true,
    welcomeEmailSentAt: asDate(data?.welcomeEmailSentAt),
    welcomeEmailStatus:
      typeof data?.welcomeEmailStatus === "string"
        ? data.welcomeEmailStatus
        : null,
  };
}

/**
 * Load users/{uid}, send the one-time welcome email if needed, and stamp the doc.
 * Never throws — failures are logged and recorded.
 */
export async function runWelcomeEmailJob(opts: {
  uid: string;
  /** Auth email when the user doc is missing email. */
  authEmail?: string | null;
}): Promise<{ outcome: string; reason?: string }> {
  try {
    const usersCol = collectionName("users");
    const data = await getAdminDocumentRest(usersCol, opts.uid);
    const user = userFromDoc(opts.uid, data, opts.authEmail ?? null);

    return await deliverWelcomeEmail({
      user,
      send: async ({ to, subject, text }) => {
        const { data: sent, error } = await getResend().emails.send({
          from: WELCOME_EMAIL_FROM,
          replyTo: WELCOME_EMAIL_REPLY_TO,
          to,
          subject,
          text,
        });
        if (error) throw new Error(error.message);
        const id = sent?.id?.trim();
        if (!id) throw new Error("Resend did not return a message id");
        return { id };
      },
      markSent: async ({ at, messageId }) => {
        await patchAdminDocumentRest(usersCol, opts.uid, {
          welcomeEmailSentAt: at,
          welcomeEmailMessageId: messageId,
          welcomeEmailStatus: "sent",
          updatedAt: at,
        });
      },
      markFailed: async (at, error) => {
        await patchAdminDocumentRest(usersCol, opts.uid, {
          welcomeEmailStatus: "failed",
          welcomeEmailLastError: error.slice(0, 500),
          updatedAt: at,
        });
      },
      recordFailure: async (failure) => {
        await createAdminDocumentRest(collectionName("emailFailures"), {
          kind: failure.kind,
          userId: failure.userId,
          to: failure.to,
          attempts: failure.attempts,
          error: failure.error.slice(0, 500),
          createdAt: failure.createdAt,
        });
      },
    });
  } catch (err) {
    console.error(`welcome email job crashed for ${opts.uid}`, err);
    return {
      outcome: "failed",
      reason: err instanceof Error ? err.message : "welcome email crashed",
    };
  }
}
