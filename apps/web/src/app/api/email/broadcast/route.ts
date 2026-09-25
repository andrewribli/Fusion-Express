import { NextResponse } from "next/server";
import { sendAdminBroadcast } from "@/lib/email";
import {
  createAdminDocumentRest,
  filterBroadcastRecipients,
  listBroadcastRecipientsRest,
  requireAdminRest,
  RestAuthError,
  type BroadcastGroup,
} from "@/lib/firestore-rest";

const GROUPS = new Set<BroadcastGroup>([
  "everyone",
  "new_users",
  "runners",
  "long_term",
]);

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]!);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => worker(),
  );
  await Promise.all(workers);
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

  if (!dryRun && (!subject || !message)) {
    return NextResponse.json(
      { error: "subject and body are required" },
      { status: 400 },
    );
  }

  try {
    const all = await listBroadcastRecipientsRest();
    const audience = body.audience ?? "all";
    const filtered = filterBroadcastRecipients(all, group).filter((person) => {
      if (audience === "customers") return !person.isRunner;
      if (audience === "runners") return person.isRunner;
      if (audience === "cuhk" || audience === "cityu") return person.campus === audience;
      return true;
    });
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
    const targets = (requested ?? recipients.map((person) => person.email))
      .filter((email) => allowed.has(email))
      .map((email) => ({ email }));

    if (targets.length === 0) {
      return NextResponse.json({
        ok: true,
        group,
        sent: 0,
        failed: [],
        count: 0,
      });
    }

    const outcomes = await mapPool(targets, 5, async (person) => {
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
    });

    const failed = outcomes
      .filter((o) => !o.ok)
      .map((o) => ({ email: o.email, error: o.error }));
    const sent = outcomes.filter((o) => o.ok).length;

    try {
      await createAdminDocumentRest("adminBroadcasts", {
        message,
        sentAt: new Date().toISOString(),
        recipientCount: sent,
        audience,
      });
    } catch (err) {
      console.error("broadcast log failed", err);
    }

    return NextResponse.json({
      ok: failed.length === 0,
      group,
      count: targets.length,
      sent,
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
