import { NextResponse } from "next/server";
import {
  sendCustomerPaymentReminder,
  sendOrderStatusUpdate,
  sendRunnerPickupReminder,
} from "@/lib/email";

function ownerAlertEmails(): string[] {
  const raw =
    process.env.OWNER_ALERT_EMAIL ?? process.env.RUNNER_ALERT_EMAIL ?? "";
  return raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function isDeliveredStatus(status: string): boolean {
  return status === "delivered" || status === "completed";
}

export async function POST(request: Request) {
  let body: {
    customerEmail?: string;
    extraEmails?: string[];
    orderId?: string;
    status?: string;
    customerName?: string;
    total?: number;
    paymentInfo?: string;
    runnerEmail?: string;
    runnerName?: string;
    deliveryLocation?: string;
    estimate?: number;
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

  const customerEmail = body.customerEmail?.trim();
  const runnerEmail = body.runnerEmail?.trim();
  const extras = (body.extraEmails ?? [])
    .map((email) => email.trim())
    .filter(Boolean);

  const jobs: Promise<void>[] = [];

  if (status === "accepted" && runnerEmail) {
    jobs.push(
      sendRunnerPickupReminder({
        to: runnerEmail,
        runnerName: body.runnerName ?? "",
        orderId,
        customerName: body.customerName ?? "",
        deliveryLocation: body.deliveryLocation?.trim() || "See the app",
        estimate: Number(body.estimate) || 0,
      }),
    );
  }

  if (isDeliveredStatus(status) && customerEmail) {
    jobs.push(
      sendCustomerPaymentReminder({
        to: customerEmail,
        customerName: body.customerName ?? "",
        total: Number(body.total) || 0,
        paymentInfo: body.paymentInfo ?? "",
      }),
    );
  }

  const statusRecipients = new Set<string>();
  if (customerEmail && !isDeliveredStatus(status)) {
    statusRecipients.add(customerEmail);
  }
  for (const email of extras) statusRecipients.add(email);
  if (isDeliveredStatus(status)) {
    for (const email of ownerAlertEmails()) statusRecipients.add(email);
  }

  for (const email of statusRecipients) {
    jobs.push(sendOrderStatusUpdate(email, orderId, status));
  }

  if (jobs.length === 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    await Promise.all(jobs);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("status email failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email" },
      { status: 502 },
    );
  }
}
