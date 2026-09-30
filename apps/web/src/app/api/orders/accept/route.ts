import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  isOwnCustomerOrder,
  NO_MATCHING_RUNNER_MESSAGE,
  normalizeRunnerCollegeId,
  RUNNER_DELIVERY_WINDOW_MS,
  runnerCollegeLabel,
  settleCollegeDiscountOnAccept,
  type StoredCollegeOrder,
} from "@fusion-express/shared";
import { collectionName } from "@/lib/constants";
import {
  sendCollegeDiscountEmail,
  sendNoCollegeDiscountEmail,
  sendOrderStatusUpdate,
} from "@/lib/email";
import {
  AdminAuthError,
  getAdminDb,
  requireAuthFromRequest,
} from "@/lib/firebase-admin";
import { supermarketForCampus } from "@fusion-express/shared/campus";

function asSplit(value: unknown): StoredCollegeOrder["discountSplit"] {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  return {
    customer: Number(row.customer),
    runner: Number(row.runner),
    platform: Number(row.platform),
  };
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Orders service unavailable." }, { status: 503 });
    }

    const body = (await request.json()) as {
      orderId?: string;
      runnerId?: string;
      paymentMethod?: string;
      paymentId?: string;
    };
    const orderId = body.orderId?.trim() ?? "";
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required." }, { status: 400 });
    }

    const userSnap = await db.collection(collectionName("users")).doc(auth.uid).get();
    const user = userSnap.data() ?? {};
    if (user.isRunner !== true) {
      return NextResponse.json({ error: "Only runners can accept orders." }, { status: 403 });
    }

    let runnerDocId = body.runnerId?.trim() ?? "";
    if (runnerDocId) {
      const runnerSnap = await db.collection(collectionName("runners")).doc(runnerDocId).get();
      if (!runnerSnap.exists || runnerSnap.get("uid") !== auth.uid) {
        return NextResponse.json({ error: "Runner profile not found." }, { status: 403 });
      }
    } else {
      const found = await db
        .collection(collectionName("runners"))
        .where("uid", "==", auth.uid)
        .limit(1)
        .get();
      if (found.empty) {
        return NextResponse.json({ error: "Runner profile not found." }, { status: 400 });
      }
      runnerDocId = found.docs[0]!.id;
    }

    const runnerCollege = normalizeRunnerCollegeId(
      typeof user.runnerCollege === "string" ? user.runnerCollege : null,
    );
    const runnerCampus = user.campus === "cityu" || user.campus === "cuhk" ? user.campus : null;
    const orderRef = db.collection(collectionName("orders")).doc(orderId);

    let notifyCustomer: string | null = null;
    let matching = false;
    let customerSavings = 0;
    let platformDiscountFee = 0;
    let customerEmail = "";
    let campus: string | undefined;

    await db.runTransaction(async (tx) => {
      notifyCustomer = null;
      matching = false;
      customerSavings = 0;
      platformDiscountFee = 0;
      customerEmail = "";
      campus = undefined;
      const snap = await tx.get(orderRef);
      if (!snap.exists) throw new Error("Order not found");
      const data = snap.data() ?? {};
      const status = String(data.status ?? "");
      if (
        isOwnCustomerOrder(
          {
            customerId: String(data.customerId ?? ""),
            customerEmail: data.customerEmail ? String(data.customerEmail) : undefined,
          },
          { uid: auth.uid, email: auth.email },
        )
      ) {
        throw new Error("You can't accept your own order.");
      }
      const orderCampus = data.campus === "cityu" || data.campus === "cuhk" ? data.campus : null;
      if (runnerCampus && orderCampus && runnerCampus !== orderCampus) {
        throw new Error("This order is on a different campus.");
      }
      if (status !== "pending" && status !== "paid") {
        if (data.runnerUid === auth.uid) return;
        throw new Error("This order was already accepted.");
      }

      const stored: StoredCollegeOrder = {
        campus: orderCampus,
        orderChannel: data.orderChannel ? String(data.orderChannel) : null,
        canteenRestaurantId: data.canteenRestaurantId
          ? String(data.canteenRestaurantId)
          : null,
        discountCollege: data.discountCollege ? String(data.discountCollege) : null,
        discountAmount: data.discountAmount != null ? Number(data.discountAmount) : null,
        discountSplit: asSplit(data.discountSplit),
        discountApplied: data.discountApplied === true,
        platformDiscountFee:
          data.platformDiscountFee != null ? Number(data.platformDiscountFee) : 0,
        collegeDiscountStatus: data.collegeDiscountStatus
          ? String(data.collegeDiscountStatus)
          : null,
        subtotal: Number(data.subtotal ?? 0),
        estimatedSubtotal:
          data.estimatedSubtotal != null ? Number(data.estimatedSubtotal) : null,
        deliveryFee: Number(data.deliveryFee ?? 0),
        tip: data.tip != null ? Number(data.tip) : 0,
        platformFee: data.platformFee != null ? Number(data.platformFee) : 0,
        total: Number(data.total ?? 0),
        status,
      };
      const settlement = settleCollegeDiscountOnAccept(stored, runnerCollege);
      const now = new Date();
      const updates: Record<string, unknown> = {
        status: "accepted",
        runnerId: runnerDocId,
        runnerUid: auth.uid,
        runnerName:
          typeof user.fullName === "string" && user.fullName.trim()
            ? user.fullName.trim()
            : "Runner",
        acceptedAt: now,
        runnerDeadline: new Date(now.getTime() + RUNNER_DELIVERY_WINDOW_MS),
        updatedAt: FieldValue.serverTimestamp(),
      };
      const method = body.paymentMethod === "FPS" ? "FPS" : body.paymentMethod === "PayMe" ? "PayMe" : user.runnerPaymentMethod;
      const paymentId =
        typeof body.paymentId === "string" && body.paymentId.trim()
          ? body.paymentId.trim()
          : typeof user.runnerPaymentId === "string"
            ? user.runnerPaymentId
            : undefined;
      if (method) updates.runnerPaymentMethod = method;
      if (paymentId) updates.runnerPaymentId = paymentId;
      if (auth.email) updates.runnerEmail = auth.email;

      if (settlement.eligible) {
        updates.discountApplied = settlement.discountApplied;
        updates.subtotal = settlement.subtotal;
        updates.total = settlement.total;
        updates.platformDiscountFee = settlement.platformDiscountFee;
        updates.collegeDiscountStatus = settlement.collegeDiscountStatus;
        if (settlement.runnerCollege) updates.runnerCollege = settlement.runnerCollege;
        if (settlement.platformDiscountFee > 0) {
          updates.platformDiscountFeeAt = now;
        } else {
          updates.platformDiscountFeeAt = FieldValue.delete();
        }
        notifyCustomer = settlement.notifyCustomer;
        matching = settlement.matching;
        customerSavings = settlement.customerSavings;
        platformDiscountFee = settlement.platformDiscountFee;
      }

      tx.update(orderRef, updates);
      customerEmail = String(data.customerEmail ?? "");
      campus = orderCampus ?? undefined;
    });

    const customerId = (
      await orderRef.get()
    ).get("customerId");

    if (matching && customerId) {
      const college = runnerCollegeLabel(runnerCollege) || "your college";
      await db.collection(collectionName("notifications")).add({
        type: "discount_received",
        userId: String(customerId),
        orderId,
        message: `Discount received! Your runner is from ${college}, so you save HK$${customerSavings.toFixed(0)} on this canteen order.`,
        read: false,
        accent: "gold",
        href: `/track?orderId=${encodeURIComponent(orderId)}`,
        createdAt: new Date(),
      });
      if (customerEmail) {
        void sendCollegeDiscountEmail({
          to: customerEmail,
          orderId,
          collegeLabel: college,
          customerSavings,
        }).catch((err) => console.error("college discount email failed", err));
      }
    } else if (notifyCustomer === NO_MATCHING_RUNNER_MESSAGE && customerId) {
      await db.collection(collectionName("notifications")).add({
        type: "discount_void",
        userId: String(customerId),
        orderId,
        message: NO_MATCHING_RUNNER_MESSAGE,
        read: false,
        accent: "default",
        href: `/track?orderId=${encodeURIComponent(orderId)}`,
        createdAt: new Date(),
      });
      if (customerEmail) {
        void sendNoCollegeDiscountEmail({ to: customerEmail, orderId }).catch((err) =>
          console.error("no-discount email failed", err),
        );
      }
    }

    if (customerEmail) {
      const store = supermarketForCampus(campus);
      void sendOrderStatusUpdate(customerEmail, orderId, "accepted", store).catch((err) =>
        console.error("status email failed", err),
      );
    }

    return NextResponse.json({
      ok: true,
      matching,
      platformDiscountFee,
      customerSavings,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Could not accept order.";
    const status = /not found/i.test(message)
      ? 404
      : /already accepted|own order|different campus|Only runners/i.test(message)
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
