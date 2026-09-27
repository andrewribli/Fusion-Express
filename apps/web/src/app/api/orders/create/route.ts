import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  ACTIVE_ORDER_LIMIT_MESSAGE,
  countsTowardCustomerOrderPlacementCap,
  getEstimatedDeliveryTime,
  isOverOrderLimit,
  lockedDeliveryPricing,
  MAX_ACTIVE_CUSTOMER_ORDERS,
  normalizeOrderStatus,
  omitUndefined,
  ORDER_LIMIT_MESSAGE,
  resolveSpecialInstructions,
} from "@fusion-express/shared";
import { findHall } from "@fusion-express/shared/halls";
import { collectionName } from "@/lib/constants";
import {
  AdminAuthError,
  getAdminDb,
  requireAuthFromRequest,
} from "@/lib/firebase-admin";

type ItemBody = {
  itemId?: string;
  name?: string;
  price?: number;
  quantity?: number;
  weightKg?: number;
};

/**
 * Creates an order and prices delivery on the server.
 * Client deliveryFee / deliveryBase / deliverySurcharge / deliveryTotal are ignored.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuthFromRequest(request);
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ error: "Orders service unavailable." }, { status: 503 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const campus = body.campus === "cityu" ? "cityu" : body.campus === "cuhk" ? "cuhk" : null;
    const hallId = typeof body.hallId === "string" ? body.hallId.trim() : typeof body.hall === "string" ? body.hall.trim() : "";
    const college = typeof body.college === "string" ? body.college.trim() : "";
    const rawItems = Array.isArray(body.items) ? (body.items as ItemBody[]) : [];
    if (!campus || !hallId || !college || rawItems.length === 0) {
      return NextResponse.json(
        { error: "campus, hall, and items are required." },
        { status: 400 },
      );
    }

    const items = rawItems.map((item) => ({
      itemId: String(item.itemId ?? "").trim(),
      name: String(item.name ?? "").trim() || "Item",
      price: Number(item.price),
      quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
      weightKg: item.weightKg != null ? Number(item.weightKg) : undefined,
    }));
    if (items.some((item) => !item.itemId || !Number.isFinite(item.price) || item.price < 0)) {
      return NextResponse.json({ error: "Each item needs an id and a price." }, { status: 400 });
    }

    const canteenIds = new Set(
      items
        .map((item) => {
          if (!item.itemId.startsWith("canteen:")) return "";
          const rest = item.itemId.slice("canteen:".length);
          const idx = rest.indexOf(":");
          return idx > 0 ? rest.slice(0, idx) : "";
        })
        .filter(Boolean),
    );
    const hasWellcome = items.some((item) => item.itemId.startsWith("wellcome:"));
    const hasOther =
      items.some(
        (item) =>
          !item.itemId.startsWith("canteen:") && !item.itemId.startsWith("wellcome:"),
      );
    if (canteenIds.size > 1 || (hasWellcome && hasOther) || (canteenIds.size > 0 && (hasWellcome || hasOther))) {
      return NextResponse.json(
        { error: "Please order from one store at a time." },
        { status: 400 },
      );
    }

    const clientSubtotal = Number(body.subtotal);
    const subtotal = Number.isFinite(clientSubtotal)
      ? Math.round(clientSubtotal * 100) / 100
      : Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
    if (isOverOrderLimit(subtotal)) {
      return NextResponse.json({ error: ORDER_LIMIT_MESSAGE }, { status: 400 });
    }

    const tip = Math.max(0, Number(body.tip) || 0);
    const priced = lockedDeliveryPricing({
      campus,
      sourceId: typeof body.sourceId === "string" ? body.sourceId : undefined,
      hallId,
      college,
      items,
      subtotal,
      tip,
      canteenRestaurantId:
        typeof body.canteenRestaurantId === "string" ? body.canteenRestaurantId : undefined,
      orderChannel: typeof body.orderChannel === "string" ? body.orderChannel : undefined,
    });

    const existing = await db
      .collection(collectionName("orders"))
      .where("customerId", "==", auth.uid)
      .orderBy("createdAt", "desc")
      .limit(40)
      .get();
    const inFlight = existing.docs.filter((doc) =>
      countsTowardCustomerOrderPlacementCap(
        normalizeOrderStatus(String(doc.get("status") ?? "")),
      ),
    ).length;
    if (inFlight >= MAX_ACTIVE_CUSTOMER_ORDERS) {
      return NextResponse.json({ error: ACTIVE_ORDER_LIMIT_MESSAGE }, { status: 400 });
    }

    if (
      campus === "cityu" &&
      (priced.sourceId === "taste" ||
        priced.sourceId === "wellcome" ||
        priced.sourceId === "ac1" ||
        priced.sourceId === "eben")
    ) {
      if (!findHall(hallId, "cityu")) {
        return NextResponse.json({ error: "Choose a CityU hall." }, { status: 400 });
      }
    }

    const now = new Date();
    const orderChannel =
      priced.sourceId === "fusion"
        ? "fusion"
        : canteenIds.size > 0 || body.orderChannel === "canteen"
          ? "canteen"
          : "taste";
    const payload = omitUndefined({
      sessionId: typeof body.sessionId === "string" ? body.sessionId : auth.uid,
      customerId: auth.uid,
      customerName:
        typeof body.customerName === "string" && body.customerName.trim()
          ? body.customerName.trim()
          : "Guest",
      customerEmail: auth.email ?? (typeof body.customerEmail === "string" ? body.customerEmail : undefined),
      campus,
      sourceId: priced.sourceId,
      orderChannel,
      canteenRestaurantId:
        typeof body.canteenRestaurantId === "string"
          ? body.canteenRestaurantId
          : canteenIds.size === 1
            ? [...canteenIds][0]
            : undefined,
      canteenCollege:
        typeof body.canteenCollege === "string" ? body.canteenCollege : undefined,
      items,
      status: "pending",
      college,
      hall: priced.quote.hallName ?? hallId,
      lobbyPoint: typeof body.lobbyPoint === "string" ? body.lobbyPoint : "",
      zone: priced.zone,
      totalWeight: priced.totalWeight,
      customerNote: resolveSpecialInstructions(
        typeof body.customerNote === "string" ? body.customerNote : undefined,
      ),
      subtotal,
      deliveryBase: priced.deliveryBase,
      deliverySurcharge: priced.deliverySurcharge,
      deliveryTotal: priced.deliveryTotal,
      deliveryFee: priced.deliveryFee,
      tip: tip || undefined,
      total: priced.total,
      paymentReceived: false,
      fusionPaidByPlatform: true,
      estimatedSubtotal: subtotal,
      estimatedDeliveryAt: getEstimatedDeliveryTime(now),
      createdAt: now,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const ref = await db.collection(collectionName("orders")).add(payload);
    return NextResponse.json({
      id: ref.id,
      sourceId: priced.sourceId,
      deliveryBase: priced.deliveryBase,
      deliverySurcharge: priced.deliverySurcharge,
      deliveryTotal: priced.deliveryTotal,
      deliveryFee: priced.deliveryFee,
      total: priced.total,
    });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Could not place order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
