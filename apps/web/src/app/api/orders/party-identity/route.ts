import { NextResponse } from "next/server";
import { counterpartyForOrder } from "@/lib/delivery-identity-server";
import {
  AdminAuthError,
  getAdminDb,
  requireAuthFromRequest,
} from "@/lib/firebase-admin";

/**
 * Name and avatar of the other person on this order.
 * Customers see their runner. The assigned runner, and a runner browsing a
 * still-open available order, see the customer. No email, phone, or uid.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Orders service unavailable." }, { status: 503 });
    }
    const body = (await request.json()) as { orderId?: string };
    const orderId = body.orderId?.trim() ?? "";
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required." }, { status: 400 });
    }
    const party = await counterpartyForOrder(db, auth, orderId);
    return NextResponse.json({ party });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("party identity lookup failed", err);
    return NextResponse.json({ error: "Could not load delivery identity." }, { status: 500 });
  }
}
