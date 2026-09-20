import { NextRequest, NextResponse } from "next/server";
import {
  airwallexJsEnv,
  createPaymentIntent,
  getAirwallexEnv,
} from "@/lib/airwallex";
import {
  getOrderRest,
  patchOrderRest,
  requireAuthRest,
  RestAuthError,
} from "@/lib/firestore-rest";

export const runtime = "nodejs";

type Body = {
  orderId?: string;
  amount?: number;
  currency?: string;
};

export async function POST(request: NextRequest) {
  let auth;
  try {
    auth = await requireAuthRest(request);
  } catch (err) {
    if (err instanceof RestAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  try {
    const order = await getOrderRest(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (String(order.customerId ?? "") !== auth.uid) {
      return NextResponse.json({ error: "Not your order." }, { status: 403 });
    }

    const status = String(order.status ?? "");
    if (status === "paid" || status === "customer_paid" || status === "completed") {
      return NextResponse.json(
        { error: "This order is already paid.", alreadyPaid: true },
        { status: 409 },
      );
    }
    if (status !== "pending") {
      return NextResponse.json(
        { error: `Cannot pay an order in status "${status}".` },
        { status: 409 },
      );
    }

    const amount =
      typeof body.amount === "number" && body.amount > 0
        ? body.amount
        : Number(order.total ?? 0);
    if (!(amount > 0)) {
      return NextResponse.json({ error: "Invalid order amount." }, { status: 400 });
    }

    const currency = (body.currency ?? "HKD").toUpperCase();
    const origin = new URL(request.url).origin;
    const returnUrl = `${origin}/checkout/payment-return?orderId=${encodeURIComponent(orderId)}`;

    const intent = await createPaymentIntent(
      orderId,
      amount,
      currency,
      {
        email: typeof order.customerEmail === "string" ? order.customerEmail : undefined,
        fullName:
          typeof order.customerName === "string" ? order.customerName : undefined,
        phone:
          typeof order.customerPhone === "string" ? order.customerPhone : undefined,
      },
      { returnUrl },
    );

    await patchOrderRest(orderId, {
      airwallexPaymentIntentId: intent.id,
      awaitingOnlinePayment: true,
      paymentProvider: "airwallex",
      updatedAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      intentId: intent.id,
      clientSecret: intent.clientSecret,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      env: airwallexJsEnv(getAirwallexEnv()),
      orderId,
    });
  } catch (err) {
    console.error("create-intent failed", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not start Airwallex payment.",
      },
      { status: 502 },
    );
  }
}
