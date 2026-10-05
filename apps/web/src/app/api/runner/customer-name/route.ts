import { NextResponse } from "next/server";
import { collectionName } from "@/lib/constants";
import { counterpartyForOrder } from "@/lib/delivery-identity-server";
import {
  AdminAuthError,
  getAdminDb,
  requireAuthFromRequest,
} from "@/lib/firebase-admin";

/**
 * Runner-only display name for the customer on an order the runner can see.
 * Anonymous customers come back as their stored pseudonym, never the order id.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: "Orders service unavailable." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { orderId?: string };
    const orderId = body.orderId?.trim() ?? "";
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required." }, { status: 400 });
    }

    const caller = await db.collection(collectionName("users")).doc(auth.uid).get();
    if (caller.data()?.isRunner !== true) {
      return NextResponse.json({ error: "Runner access required." }, { status: 403 });
    }

    const party = await counterpartyForOrder(db, auth, orderId);
    return NextResponse.json({ fullName: party?.name ?? "" });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("runner customer name lookup failed", err);
    return NextResponse.json({ error: "Could not load customer name." }, { status: 500 });
  }
}
