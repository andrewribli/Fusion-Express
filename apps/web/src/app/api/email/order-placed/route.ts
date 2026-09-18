import { NextResponse } from "next/server";
import {
  FUSION_PICKUP_LOCATION,
  sendAdminNewOrderNotice,
  sendNonRunnerOrderNudge,
  sendOrderConfirmation,
  sendRunnerNotification,
} from "@/lib/email";
import {
  AdminAuthError,
  callerIsAdmin,
  fetchOrderForEmail,
  listUserAlertRecipients,
  requireAuthFromRequest,
} from "@/lib/firebase-admin";

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
    auth = await requireAuthFromRequest(request);
  } catch (err) {
    if (err instanceof AdminAuthError) {
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
    const order = await fetchOrderForEmail(orderId, auth.idToken);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isCustomer = order.customerId === auth.uid;
    const isAdminUser = !isCustomer
      ? await callerIsAdmin(auth.uid, auth.idToken)
      : false;
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

    if (customerEmail) {
      await sendOrderConfirmation(customerEmail, order.id, items, total);
    }

    let alerted = 0;
    if (!body.skipRosterAlerts) {
      const recipients = await listUserAlertRecipients();
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

      await mapPool([...byEmail.values()], 5, async (person) => {
        if (person.isRunner) {
          await sendRunnerNotification(
            person.email,
            order.id,
            FUSION_PICKUP_LOCATION,
          );
        } else {
          await sendNonRunnerOrderNudge(
            person.email,
            order.id,
            FUSION_PICKUP_LOCATION,
          );
        }
      });
      alerted = byEmail.size;
    }

    return NextResponse.json({ ok: true, alerted });
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("order-placed email failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email" },
      { status: 502 },
    );
  }
}
