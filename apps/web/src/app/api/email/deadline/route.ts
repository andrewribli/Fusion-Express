import { NextResponse } from "next/server";
import { sendDeadlineNotice } from "@/lib/email";
import {
  AdminAuthError,
  assertOrderPartyOrAdmin,
  fetchOrderForEmail,
  requireAuthFromRequest,
} from "@/lib/firebase-admin";

function ownerAlertEmails(): string[] {
  const raw =
    process.env.OWNER_ALERT_EMAIL ?? process.env.RUNNER_ALERT_EMAIL ?? "";
  return raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
    .slice(0, 10);
}

const ALLOWED_KINDS = new Set([
  "runner_reminder",
  "customer_reminder",
  "admin_runner_missed",
  "admin_customer_missed",
  "escalate_runner",
  "escalate_customer",
]);

export async function POST(request: Request) {
  let auth;
  try {
    auth = await requireAuthFromRequest(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    kind?: string;
    orderId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const kind = body.kind?.trim() ?? "";
  if (!orderId || !kind || !ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const order = await fetchOrderForEmail(orderId, auth.idToken);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    await assertOrderPartyOrAdmin(auth, order);

    // Recipients are derived from the order / owner env list — never from the body.
    const recipients = new Set<string>();
    if (kind === "runner_reminder" || kind === "escalate_runner") {
      if (order.runnerEmail) recipients.add(order.runnerEmail);
    }
    if (kind === "customer_reminder" || kind === "escalate_customer") {
      if (order.customerEmail) recipients.add(order.customerEmail);
    }
    if (kind.startsWith("admin_")) {
      for (const email of ownerAlertEmails()) recipients.add(email);
    }

    if (recipients.size === 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await Promise.all(
      [...recipients].map((email) =>
        sendDeadlineNotice(
          email,
          order.id,
          kind as Parameters<typeof sendDeadlineNotice>[2],
        ),
      ),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("deadline email failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email" },
      { status: 502 },
    );
  }
}
