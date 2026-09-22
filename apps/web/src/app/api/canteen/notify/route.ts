import { NextResponse } from "next/server";
import {
  canteenNameForRestaurant,
  collegeLabel,
  normalizeCollegeId,
  restaurantIdFromOrderItems,
} from "@fusion-express/shared/canteen-college";
import { collectionName } from "@/lib/constants";
import {
  sendCanteenPickedUpEmail,
  sendCollegeDiscountEmail,
} from "@/lib/email";
import {
  RestAuthError,
  createAdminDocumentRest,
  getOrderRest,
  requireAuthRest,
} from "@/lib/firestore-rest";

type CanteenEvent = "discount_received" | "picked_up";

function isCanteenOrder(data: Record<string, unknown>): boolean {
  const channel = String(data.orderChannel ?? "").toLowerCase();
  if (channel === "canteen") return true;
  const items = Array.isArray(data.items) ? data.items : [];
  return items.some((row) => {
    const item = (row ?? {}) as Record<string, unknown>;
    return String(item.itemId ?? "").startsWith("canteen:");
  });
}

export async function POST(request: Request) {
  let auth;
  try {
    auth = await requireAuthRest(request);
  } catch (err) {
    if (err instanceof RestAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { orderId?: string; event?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const event = (body.event?.trim() || "") as CanteenEvent;
  if (!orderId || (event !== "discount_received" && event !== "picked_up")) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    const data = await getOrderRest(orderId);
    if (!data) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (!isCanteenOrder(data)) {
      return NextResponse.json({ ok: true, skipped: "not_canteen" });
    }

    const runnerUid = String(data.runnerUid ?? "");
    const customerId = String(data.customerId ?? data.sessionId ?? "");
    if (runnerUid !== auth.uid && customerId !== auth.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const customerEmail = String(data.customerEmail ?? "")
      .trim()
      .toLowerCase();
    const restaurantId =
      String(data.canteenRestaurantId ?? "").trim() ||
      restaurantIdFromOrderItems(
        (Array.isArray(data.items) ? data.items : []).map((row) => {
          const item = (row ?? {}) as Record<string, unknown>;
          return { itemId: String(item.itemId ?? "") };
        }),
      );
    const canteenName = canteenNameForRestaurant(restaurantId);

    if (event === "discount_received") {
      if (!data.discountApplied) {
        return NextResponse.json({ ok: true, skipped: "no_discount" });
      }
      const college =
        normalizeCollegeId(String(data.runnerCollege ?? data.canteenCollege ?? "")) ??
        String(data.runnerCollege ?? data.canteenCollege ?? "your college");
      const label = collegeLabel(college) || String(college);
      const message = `Discount received! Your runner is from ${label}, so you got 10% off your canteen order.`;

      await createAdminDocumentRest(collectionName("notifications"), {
        type: "discount_received",
        userId: customerId,
        orderId,
        message,
        read: false,
        accent: "gold",
        href: `/track?orderId=${encodeURIComponent(orderId)}`,
        createdAt: new Date(),
      });

      if (customerEmail) {
        await sendCollegeDiscountEmail({
          to: customerEmail,
          orderId,
          collegeLabel: label,
        });
      }
      return NextResponse.json({ ok: true });
    }

    // picked_up
    const message = `Your runner just picked up your order from ${canteenName}.`;
    await createAdminDocumentRest(collectionName("notifications"), {
      type: "picked_up",
      userId: customerId,
      orderId,
      message,
      read: false,
      accent: "default",
      href: `/track?orderId=${encodeURIComponent(orderId)}`,
      createdAt: new Date(),
    });

    if (customerEmail) {
      await sendCanteenPickedUpEmail({
        to: customerEmail,
        orderId,
        canteenName,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RestAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("canteen notify failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not notify" },
      { status: 502 },
    );
  }
}
