import { NextResponse } from "next/server";
import {
  sendAdminBroadcast,
  sendAdminBroadcastBatch,
} from "@/lib/email";
import { BROADCAST_BATCH_SIZE, chunkEmails } from "@/lib/broadcast-batch";
import { collectionName } from "@/lib/constants";
import {
  createAdminDocumentRest,
  filterBroadcastRecipients,
  listBroadcastRecipientsRest,
  requireAdminRest,
  RestAuthError,
  type BroadcastGroup,
} from "@/lib/firestore-rest";

export const runtime = "nodejs";
export const maxDuration = 300;

const GROUPS = new Set<BroadcastGroup>([
  "everyone",
  "new_users",
  "runners",
  "long_term",
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recordBroadcastFailures(
  failures: { email: string; error: string }[],
  meta: { subject: string; group: BroadcastGroup },
): Promise<void> {
  for (const failure of failures) {
    try {
      await createAdminDocumentRest(collectionName("emailFailures"), {
        kind: "admin_broadcast",
        to: failure.email,
        subject: meta.subject,
        group: meta.group,
        attempts: 1,
        error: failure.error.slice(0, 500),
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("emailFailures write failed for broadcast", failure.email, err);
    }
  }
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
    const status =
      err && typeof err === "object" && "status" in err
        ? Number((err as { status: unknown }).status)
        : NaN;
    if (Number.isFinite(status) && status >= 400 && status < 600) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Unauthorized" },
        { status },
      );
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

  const group = body.group as BroadcastGroup | undefined;
  if (!group || !GROUPS.has(group)) {
    return NextResponse.json(
      { error: "group must be everyone, new_users, runners, or long_term" },
      { status: 400 },
    );
  }

  const subject = body.subject?.trim() ?? "";
  const message = body.body?.trim() ?? "";
  const test = Boolean(body.test);
  const dryRun = Boolean(body.dryRun);

  if (!dryRun && !test && (!subject || !message)) {
    return NextResponse.json(
      { error: "subject and body are required" },
      { status: 400 },
    );
  }

  try {
    const listed = await listBroadcastRecipientsRest();
    const audience = body.audience ?? "all";
    const filtered = filterBroadcastRecipients(listed.recipients, group).filter(
      (person) => {
        if (audience === "customers") return !person.isRunner;
        if (audience === "runners") return person.isRunner;
        if (audience === "cuhk" || audience === "cityu") {
          return person.campus === audience;
        }
        return true;
      },
    );
    const recipients = filtered
      .map((person) => ({
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
        scannedDocs: listed.scannedDocs,
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
    const targets = (requested ?? recipients.map((person) => person.email)).filter(
      (email) => allowed.has(email),
    );

    if (targets.length === 0) {
      return NextResponse.json({
        ok: true,
        group,
        sent: 0,
        failed: [],
        count: 0,
        scannedDocs: listed.scannedDocs,
      });
    }

    const failed: { email: string; error: string }[] = [];
    let sent = 0;
    const batches = chunkEmails(targets, BROADCAST_BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]!;
      const outcome = await sendAdminBroadcastBatch(batch, subject, message);
      sent += outcome.sent.length;
      failed.push(...outcome.failed);
      if (outcome.failed.length > 0) {
        await recordBroadcastFailures(outcome.failed, { subject, group });
      }
      // Resend free/pro windows are tight; pause between batches.
      if (i < batches.length - 1) await sleep(1100);
    }

    try {
      await createAdminDocumentRest("adminBroadcasts", {
        message,
        sentAt: new Date().toISOString(),
        recipientCount: sent,
        attemptedCount: targets.length,
        failedCount: failed.length,
        scannedDocs: listed.scannedDocs,
        audience,
        group,
      });
    } catch (err) {
      console.error("broadcast log failed", err);
    }

    console.log(
      `broadcast complete group=${group} attempted=${targets.length} sent=${sent} failed=${failed.length} scannedDocs=${listed.scannedDocs}`,
    );

    return NextResponse.json({
      ok: failed.length === 0,
      group,
      count: targets.length,
      sent,
      failed,
      scannedDocs: listed.scannedDocs,
    });
  } catch (err) {
    console.error("broadcast email failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email" },
      { status: 502 },
    );
  }
}
