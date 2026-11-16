import { NextResponse } from "next/server";
import { supermarketPickupLocation } from "@fusion-express/shared/campus";
import {
  sendAdminNewOrderNotice,
  sendNonRunnerOrderNudge,
  sendOrderConfirmation,
  sendRunnerNotification,
} from "@/lib/email";
import {
  fetchOrderForEmailRest,
  isAdminUidRest,
  listUserAlertRecipientsRest,
  requireAuthRest,
  RestAuthError,
} from "@/lib/firestore-rest";
import { notifyOwnerWhatsAppNewOrder } from "@/lib/whatsapp";

export const runtime = "nodejs";

async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = items[index++];
      try {
        await fn(current);
      } catch (err) {
        console.error("order alert email failed", err);
      }
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => worker(),
  );
  await Promise.all(workers);
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

  let body: {
    orderId?: string;
    skipRosterAlerts?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  try {
    const order = await fetchOrderForEmailRest(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isCustomer = order.customerId === auth.uid;
    const isAdminUser = !isCustomer ? await isAdminUidRest(auth.uid) : false;
    if (!isCustomer && !isAdminUser) {
      return NextResponse.json(
        { error: "Not allowed for this order." },
        { status: 403 },
      );
    }

    const items = order.items;
    const total = order.total || order.finalTotal || 0;
    const customerEmail = order.customerEmail;

    try {
      await sendAdminNewOrderNotice({
        customerName: order.customerName,
        items,
        deliveryLocation: order.deliveryLocation,
        total,
        orderId: order.id,
      });
    } catch (err) {
      console.error("admin new-order notice failed after retry", err);
    }

    try {
      const wa = await notifyOwnerWhatsAppNewOrder({
        customerName: order.customerName,
        items,
        deliveryLocation: order.deliveryLocation,
        total,
        orderId: order.id,
      });
      if (!wa.sent && wa.skipped) {
        console.info("owner WhatsApp skipped:", wa.skipped);
      }
    } catch (err) {
      console.error("owner WhatsApp new-order failed", err);
    }

    if (customerEmail) {
      await sendOrderConfirmation(customerEmail, order.id, items, total);
    }

    let alerted = 0;
    if (!body.skipRosterAlerts) {
      const recipients = await listUserAlertRecipientsRest();
      const envRunners = (process.env.RUNNER_ALERT_EMAIL ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

      const byEmail = new Map<
        string,
        { email: string; isRunner: boolean }
      >();
      for (const r of recipients) {
        if (customerEmail && r.email === customerEmail) continue;
        if (r.campus !== order.campus) continue;
        byEmail.set(r.email, r);
      }
      for (const email of envRunners) {
        if (customerEmail && email === customerEmail) continue;
        const existing = byEmail.get(email);
        byEmail.set(email, {
          email,
          isRunner: existing?.isRunner ?? true,
        });
      }

      const pickupLocation =
        order.orderChannel === "canteen"
          ? "Campus canteen (see the app for which one)"
          : supermarketPickupLocation(order.campus);
      await mapPool([...byEmail.values()], 5, async (person) => {
        if (person.isRunner) {
          await sendRunnerNotification(person.email, order.id, pickupLocation);
        } else {
          await sendNonRunnerOrderNudge(
            person.email,
            order.id,
            pickupLocation,
            order.campus,
          );
        }
      });
      alerted = byEmail.size;
    }

    return NextResponse.json({ ok: true, alerted });
  } catch (err) {
    if (err instanceof RestAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("order-placed email failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email" },
      { status: 502 },
    );
  }
}
