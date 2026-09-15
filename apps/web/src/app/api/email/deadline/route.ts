import { NextResponse } from "next/server";
import { sendDeadlineNotice } from "@/lib/email";

function ownerAlertEmails(): string[] {
  const raw =
    process.env.OWNER_ALERT_EMAIL ?? process.env.RUNNER_ALERT_EMAIL ?? "";
  return raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export async function POST(request: Request) {
  let body: {
    kind?: string;
    orderId?: string;
    email?: string;
    extraEmails?: string[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const kind = body.kind?.trim();
  if (!orderId || !kind) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const recipients = new Set<string>();
  if (body.email?.trim()) recipients.add(body.email.trim());
  for (const email of body.extraEmails ?? []) {
    if (email.trim()) recipients.add(email.trim());
  }
  if (kind.startsWith("admin_")) {
    for (const email of ownerAlertEmails()) recipients.add(email);
  }

  if (recipients.size === 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    await Promise.all(
      [...recipients].map((email) =>
        sendDeadlineNotice(
          email,
          orderId,
          kind as Parameters<typeof sendDeadlineNotice>[2],
        ),
      ),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("deadline email failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email" },
      { status: 502 },
    );
  }
}
