import { NextRequest, NextResponse } from "next/server";
import {
  retrievePaymentIntent,
  verifyAirwallexWebhookSignature,
} from "@/lib/airwallex";
import { markOrderPaidFromAirwallex } from "@/lib/airwallex-order-paid";

export const runtime = "nodejs";

type WebhookEvent = {
  id?: string;
  name?: string;
  data?: {
    object?: {
      id?: string;
      status?: string;
      amount?: number;
      currency?: string;
      merchant_order_id?: string;
      metadata?: Record<string, string>;
    };
  };
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-timestamp");
  const signature = request.headers.get("x-signature");
  const secret = process.env.AIRWALLEX_WEBHOOK_SECRET?.trim();

  if (secret) {
    const ok = verifyAirwallexWebhookSignature({
      rawBody,
      timestamp,
      signature,
      secret,
    });
    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else if (process.env.VERCEL_ENV === "production") {
    console.error("AIRWALLEX_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 503 },
    );
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = event.name ?? "";
  if (name !== "payment_intent.succeeded") {
    return NextResponse.json({ ok: true, ignored: name || "unknown" });
  }

  const obj = event.data?.object;
  const intentId = obj?.id?.trim();
  if (!intentId) {
    return NextResponse.json({ error: "Missing payment intent id" }, { status: 400 });
  }

  let intent;
  try {
    intent = await retrievePaymentIntent(intentId);
  } catch (err) {
    console.error("retrievePaymentIntent failed", err);
    return NextResponse.json({ error: "Could not verify intent" }, { status: 502 });
  }

  if (String(intent.status).toUpperCase() !== "SUCCEEDED") {
    return NextResponse.json({
      ok: true,
      ignored: `intent status ${intent.status}`,
    });
  }

  const orderId =
    intent.merchantOrderId?.trim() ||
    obj?.merchant_order_id?.trim() ||
    obj?.metadata?.gracerun_order_id?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Missing merchant_order_id" }, { status: 400 });
  }

  try {
    const result = await markOrderPaidFromAirwallex({
      orderId,
      intentId,
      amount: intent.amount,
      currency: intent.currency,
      webhookEventId: event.id ?? null,
    });
    return NextResponse.json({
      ok: true,
      orderId,
      status: "paid",
      ...result,
    });
  } catch (err) {
    console.error("markOrderPaidFromAirwallex failed", err);
    const message = err instanceof Error ? err.message : "Update failed";
    const status = message === "Order not found" ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
