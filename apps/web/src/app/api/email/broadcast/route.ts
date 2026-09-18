import { NextResponse } from "next/server";
import { sendAdminBroadcast } from "@/lib/email";
import {
  AdminAuthError,
  filterBroadcastRecipients,
  listBroadcastRecipients,
  requireAdminFromRequest,
  type BroadcastGroup,
} from "@/lib/firebase-admin";

const GROUPS = new Set<BroadcastGroup>(["new_users", "runners", "long_term"]);

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
    admin = await requireAdminFromRequest(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
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
    test?: boolean;
    dryRun?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const group = body.group as BroadcastGroup | undefined;
  if (!group || !GROUPS.has(group)) {
    return NextResponse.json(
      { error: "group must be new_users, runners, or long_term" },
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
    const all = await listBroadcastRecipients(admin.idToken);
    const filtered = filterBroadcastRecipients(all, group);

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        group,
        count: filtered.length,
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

    if (filtered.length === 0) {
      return NextResponse.json({
        ok: true,
        group,
        sent: 0,
        failed: [],
        count: 0,
      });
    }

    const outcomes = await mapPool(filtered, 5, async (person) => {
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

    return NextResponse.json({
      ok: failed.length === 0,
      group,
      count: filtered.length,
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
