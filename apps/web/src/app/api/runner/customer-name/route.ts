import { NextResponse } from "next/server";
import { collectionName } from "@/lib/constants";
import {
  AdminAuthError,
  getAdminDb,
  requireAuthFromRequest,
} from "@/lib/firebase-admin";

function textName(value: unknown, orderId: string): string {
  if (typeof value !== "string") return "";
  const name = value.trim();
  if (!name || name === orderId) return "";
  return name;
}

function nameFromRecord(
  data: Record<string, unknown>,
  orderId: string,
): string {
  return (
    textName(data.customerName, orderId) ||
    textName(data.fullName, orderId) ||
    textName(data.name, orderId)
  );
}

/**
 * Runner-only: the customer's full name for an order the runner can see.
 * Reads the order first, then the user profile's fullName when the order
 * has no name. Returns an empty string when the name is missing.
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

    const orderSnap = await db.collection(collectionName("orders")).doc(orderId).get();
    if (!orderSnap.exists) return NextResponse.json({ fullName: "" });

    const data = orderSnap.data() ?? {};
    const status = String(data.status ?? "");
    const runnerUid = String(data.runnerUid ?? "");
    const visible =
      status === "pending" || status === "paid" || runnerUid === auth.uid;
    if (!visible) return NextResponse.json({ fullName: "" });

    const onOrder = nameFromRecord(data, orderId);
    if (onOrder) return NextResponse.json({ fullName: onOrder });

    const customerId = String(data.customerId ?? "").trim();
    if (!customerId) return NextResponse.json({ fullName: "" });

    const profile = await db
      .collection(collectionName("users"))
      .doc(customerId)
      .get();
    const fullName = nameFromRecord(profile.data() ?? {}, orderId);
    return NextResponse.json({ fullName });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("runner customer name lookup failed", err);
    return NextResponse.json({ error: "Could not load customer name." }, { status: 500 });
  }
}
