import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { collegeDiscountOnCancel } from "@fusion-express/shared";
import { collectionName } from "@/lib/constants";
import {
  AdminAuthError,
  getAdminDb,
  requireAuthFromRequest,
} from "@/lib/firebase-admin";

/** After a cancel, drop the platform slice so the runner is not paid the bonus. */
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
    const ref = db.collection(collectionName("orders")).doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    const data = snap.data() ?? {};
    if (String(data.customerId ?? "") !== auth.uid) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    if (String(data.status ?? "") !== "cancelled") {
      return NextResponse.json({ ok: true, cleared: false });
    }
    const cleared = collegeDiscountOnCancel({
      subtotal: Number(data.subtotal ?? 0),
      deliveryFee: Number(data.deliveryFee ?? 0),
      total: Number(data.total ?? 0),
      platformDiscountFee:
        data.platformDiscountFee != null ? Number(data.platformDiscountFee) : 0,
      collegeDiscountStatus: data.collegeDiscountStatus
        ? String(data.collegeDiscountStatus)
        : null,
      status: "cancelled",
    });
    if (!cleared.clearFee) return NextResponse.json({ ok: true, cleared: false });
    await ref.update({
      platformDiscountFee: 0,
      platformDiscountFeeAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true, cleared: true, platformDiscountFee: 0 });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Could not update the order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
