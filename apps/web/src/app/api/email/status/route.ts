import { NextResponse } from "next/server";
import { supermarketForCampus } from "@fusion-express/shared/campus";
import {
  sendCustomerPaymentReminder,
  sendOrderStatusUpdate,
  sendRunnerPickupReminder,
} from "@/lib/email";
import {
  AdminAuthError,
  assertOrderPartyOrAdmin,
  fetchOrderForEmail,
  paymentInfoFromOrder,
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

function isDeliveredStatus(status: string): boolean {
  return status === "delivered" || status === "completed";
}

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
    orderId?: string;
    status?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const status = (body.status?.trim() || "").slice(0, 64);
  if (!orderId || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const order = await fetchOrderForEmail(orderId, auth.idToken);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    await assertOrderPartyOrAdmin(auth, order);

    // Recipients and payment copy come from the order doc — never from the body.
    const customerEmail = order.customerEmail;
    const runnerEmail = order.runnerEmail;
    const paymentInfo = paymentInfoFromOrder(order);
    const total =
      order.finalTotal ||
      order.amountPaidByRunner ||
      order.total ||
      0;

    const jobs: Promise<void>[] = [];

    if (status === "accepted" && runnerEmail) {
      jobs.push(
        sendRunnerPickupReminder({
          to: runnerEmail,
          runnerName: order.runnerName,
          orderId: order.id,
          customerName: order.customerName,
          deliveryLocation: order.deliveryLocation || "See the app",
          estimate: order.total || 0,
        }),
      );
    }

    if (isDeliveredStatus(status) && customerEmail) {
      jobs.push(
        sendCustomerPaymentReminder({
          to: customerEmail,
          customerName: order.customerName,
          total,
          paymentInfo,
        }),
      );
    }

    const statusRecipients = new Set<string>();
    if (customerEmail && !isDeliveredStatus(status)) {
      statusRecipients.add(customerEmail);
    }
    if (isDeliveredStatus(status)) {
      for (const email of ownerAlertEmails()) statusRecipients.add(email);
    }
    // Runner payout / status pings when the runner email is on the order.
    if (
      runnerEmail &&
      (status === "runner_paid" || status === "paid" || status === "customer_paid")
    ) {
      statusRecipients.add(runnerEmail);
    }

    const store =
      order.orderChannel === "canteen"
        ? "the canteen"
        : supermarketForCampus(order.campus);
    for (const email of statusRecipients) {
      jobs.push(sendOrderStatusUpdate(email, order.id, status, store));
    }

    if (jobs.length === 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await Promise.all(jobs);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("status email failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email" },
      { status: 502 },
    );
  }
}
