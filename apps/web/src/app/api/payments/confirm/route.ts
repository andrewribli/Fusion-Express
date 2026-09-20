import { NextRequest, NextResponse } from "next/server";
import { retrievePaymentIntent } from "@/lib/airwallex";
import { markOrderPaidFromAirwallex } from "@/lib/airwallex-order-paid";
import { collectionName } from "@/lib/constants";
import {
  AdminAuthError,
  getAdminDb,
  requireAuthFromRequest,
} from "@/lib/firebase-admin";

export const runtime = "nodejs";

/**
 * Fallback when webhooks are not yet configured: customer lands on
 * /checkout/payment-return and we confirm SUCCEEDED with Airwallex, then mark paid.
 */
export async function POST(request: NextRequest) {
  let auth;
  try {
    auth = await requireAuthFromRequest(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { orderId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Firestore unavailable" }, { status: 503 });
  }

  const snap = await db.collection(collectionName("orders")).doc(orderId).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const data = snap.data() as Record<string, unknown>;
  if (String(data.customerId ?? "") !== auth.uid) {
    return NextResponse.json({ error: "Not your order." }, { status: 403 });
  }

  const status = String(data.status ?? "");
  if (
    data.paymentReceived === true ||
    status === "paid" ||
    status === "completed" ||
    status === "customer_paid"
  ) {
    return NextResponse.json({ ok: true, status, alreadyPaid: true, paid: true });
  }

  const intentId = String(data.airwallexPaymentIntentId ?? "").trim();
  if (!intentId) {
    return NextResponse.json(
      { error: "No Airwallex payment intent on this order." },
      { status: 409 },
    );
  }

  let intent;
  try {
    intent = await retrievePaymentIntent(intentId);
  } catch (err) {
    console.error("confirm retrievePaymentIntent failed", err);
    return NextResponse.json({ error: "Could not verify payment." }, { status: 502 });
  }

  if (String(intent.status).toUpperCase() !== "SUCCEEDED") {
    return NextResponse.json({
      ok: false,
      status: intent.status,
      paid: false,
    });
  }

  try {
    await markOrderPaidFromAirwallex({
      orderId,
      intentId,
      amount: intent.amount,
      currency: intent.currency,
    });
    return NextResponse.json({ ok: true, status: "paid", paid: true });
  } catch (err) {
    console.error("confirm mark paid failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not mark paid." },
      { status: 502 },
    );
  }
}
