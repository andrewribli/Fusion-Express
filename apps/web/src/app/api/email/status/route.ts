import { NextResponse } from "next/server";
import { sendOrderStatusUpdate } from "@/lib/email";

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
    customerEmail?: string;
    extraEmails?: string[];
    orderId?: string;
    status?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const status = body.status?.trim();
  if (!orderId || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const recipients = new Set<string>();
  if (body.customerEmail?.trim()) recipients.add(body.customerEmail.trim());
  for (const email of body.extraEmails ?? []) {
    if (email.trim()) recipients.add(email.trim());
  }
  if (status === "delivered") {
    for (const email of ownerAlertEmails()) recipients.add(email);
  }

  if (recipients.size === 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    await Promise.all(
      [...recipients].map((email) =>
        sendOrderStatusUpdate(email, orderId, status),
      ),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("status email failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email" },
      { status: 502 },
    );
  }
}
