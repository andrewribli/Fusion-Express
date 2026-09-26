import { NextResponse } from "next/server";
import { sendAdminBroadcast } from "@/lib/email";
import { collectionName } from "@/lib/constants";
import {
  createAdminDocumentRest,
  filterBroadcastRecipients,
  listBroadcastRecipientsRest,
  requireAdminRest,
  RestAuthError,
  type BroadcastGroup,
} from "@/lib/firestore-rest";

export const maxDuration = 60;

const GROUPS = new Set<BroadcastGroup>([
  "everyone",
  "new_users",
  "runners",
  "long_term",
]);

/** Soft rate limit inside one serverless invocation (Resend free tier). */
const EMAIL_GAP_MS = 600;
const EMAIL_CONCURRENCY = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  gapMs: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]!);
      if (gapMs > 0 && index < items.length) await sleep(gapMs);
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(items.length, 1)) },
      () => worker(),
    ),
  );
  return results;
}

export async function POST(request: Request) {
  try {
    return await handleBroadcast(request);
  } catch (err) {
    console.error("broadcast route crash", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email" },
      { status: 500 },
    );
  }
}

async function handleBroadcast(request: Request) {
  let admin: { uid: string; email: string | null; idToken: string };
  try {
    admin = await requireAdminRest(request);
  } catch (err) {
    if (err instanceof RestAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  let body: {
    group?: string;
    subject?: string;
    body?: string;
    emails?: string[];
    test?: boolean;
    dryRun?: boolean;
    audience?: "all" | "customers" | "runners" | "cuhk" | "cityu";
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const group = (body.group as BroadcastGroup | undefined) ?? "everyone";
  if (!GROUPS.has(group)) {
    return NextResponse.json(
      { error: "group must be everyone, new_users, runners, or long_term" },
      { status: 400 },
    );
  }

  const subject = body.subject?.trim() || "Message from GraceRun";
  const message = body.body?.trim() ?? "";
  const test = Boolean(body.test);
  const dryRun = Boolean(body.dryRun);

  if (!dryRun && !message) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  try {
    const all = await listBroadcastRecipientsRest();
    const audience = body.audience ?? "all";
    const filtered = filterBroadcastRecipients(all, group).filter((person) => {
      if (audience === "customers") return !person.isRunner;
      if (audience === "runners") return person.isRunner;
      if (audience === "cuhk" || audience === "cityu") {
        return person.campus === audience;
      }
      return true;
    });
    const recipients = filtered
      .map((person) => ({
        uid: person.uid,
        email: person.email,
        name: person.name,
        isRunner: person.isRunner,
      }))
      .sort((a, b) =>
        (a.name || a.email).localeCompare(b.name || b.email, "en", {
          sensitivity: "base",
        }),
      );

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        group,
        count: recipients.length,
        recipients,
      });
    }

    if (test) {
      const to = admin.email;
      if (!to) {
        return NextResponse.json(
          { error: "Your admin account has no email for test send." },
          { status: 400 },
        );
      }
      await sendAdminBroadcast(to, subject, message);
      return NextResponse.json({
        ok: true,
        test: true,
        sent: 1,
        failed: [],
        to,
      });
    }

    const requested = Array.isArray(body.emails)
      ? [
          ...new Set(
            body.emails
              .map((email) => String(email).trim().toLowerCase())
              .filter((email) => email.includes("@")),
          ),
        ]
      : null;
    if (requested && requested.length === 0) {
      return NextResponse.json(
        { error: "Select at least one recipient." },
        { status: 400 },
      );
    }
    const allowed = new Set(recipients.map((person) => person.email));
    const targets = (
      requested
        ? recipients.filter((person) => requested.includes(person.email))
        : recipients
    ).filter((person) => allowed.has(person.email));

    if (targets.length === 0) {
      return NextResponse.json({
        ok: true,
        group,
        sent: 0,
        failed: [],
        count: 0,
      });
    }

    // In-app notifications — immediate.
    let notified = 0;
    await mapPool(targets, 8, 0, async (person) => {
      if (!person.uid) return;
      try {
        await createAdminDocumentRest(collectionName("notifications"), {
          type: "admin_broadcast",
          userId: person.uid,
          orderId: "",
          message,
          read: false,
          createdAt: new Date().toISOString(),
          href: "/",
        });
        notified += 1;
      } catch (err) {
        console.error("broadcast notification failed", person.uid, err);
      }
    });

    // Queue remaining email work for gradual drain (10 min window intent).
    // Process a first wave now; enqueue the rest so free-tier limits are respected.
    const immediateCap = Math.min(targets.length, 40);
    const immediate = targets.slice(0, immediateCap);
    const queued = targets.slice(immediateCap);

    for (const person of queued) {
      try {
        await createAdminDocumentRest("adminBroadcastQueue", {
          email: person.email,
          subject,
          message,
          createdAt: new Date().toISOString(),
          status: "pending",
          sentBy: admin.uid,
          audience,
        });
      } catch (err) {
        console.error("broadcast queue write failed", err);
      }
    }

    const outcomes = await mapPool(
      immediate,
      EMAIL_CONCURRENCY,
      EMAIL_GAP_MS,
      async (person) => {
        try {
          await sendAdminBroadcast(person.email, subject, message);
          return { ok: true as const, email: person.email };
        } catch (err) {
          return {
            ok: false as const,
            email: person.email,
            error: err instanceof Error ? err.message : "Send failed",
          };
        }
      },
    );

    const failed = outcomes
      .filter((o) => !o.ok)
      .map((o) => ({ email: o.email, error: o.error }));
    const sent = outcomes.filter((o) => o.ok).length;

    try {
      await createAdminDocumentRest("adminBroadcasts", {
        message,
        sentAt: new Date().toISOString(),
        audience,
        recipientCount: targets.length,
        sentBy: admin.uid,
        emailedNow: sent,
        queuedEmails: queued.length,
        notified,
      });
    } catch (err) {
      console.error("broadcast log failed", err);
    }

    return NextResponse.json({
      ok: failed.length === 0,
      group,
      count: targets.length,
      sent,
      notified,
      queued: queued.length,
      failed,
    });
  } catch (err) {
    console.error("broadcast email failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email" },
      { status: 502 },
    );
  }
}
