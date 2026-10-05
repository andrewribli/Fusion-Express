import { NextResponse } from "next/server";
import {
  RestAuthError,
  getOrderRest,
  isAdminUidRest,
  requireAuthRest,
} from "@/lib/firestore-rest";
import { warnExpiredOrderById } from "@/lib/expired-warning-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Persist an expired delivery and email the runner once.
 * Caller must be the runner, the customer, or an admin. Email errors stay here.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuthRest(request);
    let body: { orderId?: string };
    try {
      body = (await request.json()) as { orderId?: string };
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const orderId = body.orderId?.trim() ?? "";
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const data = await getOrderRest(orderId);
    if (!data) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const runnerUid = String(data.runnerUid ?? "");
    const customerId = String(data.customerId ?? "");
    const isParty = auth.uid === runnerUid || auth.uid === customerId;
    const isAdmin = isParty ? false : await isAdminUidRest(auth.uid);
    if (!isParty && !isAdmin) {
      return NextResponse.json({ error: "Not allowed for this order." }, { status: 403 });
    }

    const outcome = await warnExpiredOrderById(orderId);
    return NextResponse.json({ ok: outcome !== "failed", outcome });
  } catch (err) {
    if (err instanceof RestAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("expired warning route failed", err);
    return NextResponse.json({ ok: false, outcome: "failed" });
  }
}
