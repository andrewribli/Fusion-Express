import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  assertDeliveryTransition,
  isCityuCanteenOrder,
  normalizeOrderStatus,
  parseHkdAmount,
  type OrderStatus,
} from "@fusion-express/shared";
import { collectionName } from "@/lib/constants";
import {
  AdminAuthError,
  callerIsAdmin,
  getAdminDb,
  requireAuthFromRequest,
} from "@/lib/firebase-admin";
import { sendOrderStatusUpdate } from "@/lib/email";
import { supermarketForCampus } from "@fusion-express/shared/campus";

const OPEN = new Set(["accepted", "purchased", "receipt_uploaded"]);

export async function POST(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Orders service unavailable." }, { status: 503 });
    }

    const body = (await request.json()) as {
      orderId?: string;
      to?: string;
      receiptUrl?: string;
      receiptAmount?: number;
      dropoffPhotoUrl?: string;
    };
    const orderId = body.orderId?.trim() ?? "";
    const to = body.to?.trim() ?? "";
    if (!orderId || !to) {
      return NextResponse.json({ error: "orderId and to are required." }, { status: 400 });
    }

    const ref = db.collection(collectionName("orders")).doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    const data = snap.data() ?? {};
    const from = normalizeOrderStatus(String(data.status ?? "pending"));
    const runnerUid = String(data.runnerUid ?? "");
    const isAssigned = runnerUid === auth.uid;
    const isAdmin = await callerIsAdmin(auth.uid, auth.idToken);
    const actor = isAdmin
      ? "admin"
      : isAssigned || to === "accepted"
        ? "runner"
        : "customer";

    if (to === "accepted") {
      const busy = await db
        .collection(collectionName("orders"))
        .where("runnerUid", "==", auth.uid)
        .where("status", "in", [...OPEN])
        .limit(1)
        .get();
      if (!busy.empty) {
        return NextResponse.json(
          { error: "Finish your current delivery before accepting another order." },
          { status: 409 },
        );
      }
    }

    const receiptUrl = body.receiptUrl?.trim() || String(data.receiptUrl ?? "");
    const dropoff =
      body.dropoffPhotoUrl?.trim() ||
      String(data.dropoffPhotoUrl ?? data.deliveryPhotoUrl ?? "");
    const receiptAmount =
      parseHkdAmount(data.receiptAmount) ?? parseHkdAmount(body.receiptAmount);
    const items = Array.isArray(data.items) ? data.items : [];
    const requireReceiptTotal = isCityuCanteenOrder({
      campus: typeof data.campus === "string" ? data.campus : undefined,
      orderChannel:
        typeof data.orderChannel === "string" ? data.orderChannel : undefined,
      items: items.map((item) => {
        const row = item as { itemId?: unknown };
        return { itemId: String(row?.itemId ?? "") };
      }),
    });

    assertDeliveryTransition({
      from,
      to: to as OrderStatus,
      actor,
      isAssignedRunner: isAssigned || to === "accepted",
      receiptUrl,
      receiptAmount,
      dropoffPhotoUrl: dropoff,
      requireReceiptTotal,
    });

    const now = FieldValue.serverTimestamp();
    const updates: Record<string, unknown> = { status: to, updatedAt: now };
    if (to === "accepted") {
      updates.runnerUid = auth.uid;
      updates.acceptedAt = now;
    }
    if (to === "purchased") updates.purchasedAt = now;
    if (to === "receipt_uploaded") {
      updates.receiptUrl = receiptUrl;
      updates.receiptUploadedAt = now;
      if (receiptAmount != null && receiptAmount > 0) {
        updates.receiptAmount = receiptAmount;
        updates.finalTotal = receiptAmount;
      }
    }
    if (to === "delivered") {
      updates.dropoffPhotoUrl = dropoff;
      updates.deliveryPhotoUrl = dropoff;
      updates.deliveredAt = now;
    }
    if (to === "runner_paid") updates.runnerPaidAt = now;
    if (to === "completed") updates.completedAt = now;

    await ref.update(updates);

    const customerEmail = String(data.customerEmail ?? "");
    if (customerEmail && (to === "accepted" || to === "delivered" || to === "receipt_uploaded")) {
      const store = supermarketForCampus(data.campus);
      void sendOrderStatusUpdate(customerEmail, orderId, to, store).catch((err) => {
        console.error("status email failed", err);
      });
    }

    return NextResponse.json({ ok: true, status: to });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Could not update order.";
    const status = /Cannot move|Only |required|Upload|receipt total|HKD/i.test(message)
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
