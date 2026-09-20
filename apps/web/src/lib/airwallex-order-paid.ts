import "server-only";
import {
  FUSION_PICKUP_LOCATION,
  sendAdminNewOrderNotice,
  sendNonRunnerOrderNudge,
  sendOrderConfirmation,
  sendRunnerNotification,
} from "@/lib/email";
import { collectionName } from "@/lib/constants";
import { getAdminDb, listUserAlertRecipients } from "@/lib/firebase-admin";

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
        console.error("paid-order alert email failed", err);
      }
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(items.length, 1)) },
      () => worker(),
    ),
  );
}

export async function markOrderPaidFromAirwallex(opts: {
  orderId: string;
  intentId: string;
  amount: number;
  currency: string;
  webhookEventId?: string | null;
}): Promise<{ updated: boolean; notified: boolean; prevStatus: string }> {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore unavailable");

  const ref = db.collection(collectionName("orders")).doc(opts.orderId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Order not found");

  const data = snap.data() as Record<string, unknown>;
  const prevStatus = String(data.status ?? "");
  const alreadyPaid =
    data.paymentReceived === true ||
    ["paid", "customer_paid", "completed", "accepted", "purchased", "delivered", "runner_paid"].includes(
      prevStatus,
    );

  const now = new Date();
  if (!alreadyPaid || prevStatus === "pending") {
    await ref.update({
      status: "paid",
      paymentReceived: true,
      awaitingOnlinePayment: false,
      customerPaidAt: now,
      airwallexPaymentIntentId: opts.intentId,
      airwallexPaidAmount: opts.amount,
      airwallexPaidCurrency: opts.currency,
      ...(opts.webhookEventId
        ? { airwallexWebhookEventId: opts.webhookEventId }
        : {}),
      paymentProvider: "airwallex",
      updatedAt: now,
    });
  }

  let notified = false;
  if (prevStatus === "pending" && !data.airwallexPaidNotifiedAt) {
    const items = Array.isArray(data.items)
      ? (data.items as { name: string; quantity: number; price: number }[])
      : [];
    const total = Number(data.total ?? opts.amount ?? 0);
    const deliveryLocation = [
      data.college,
      data.hall,
      data.lobbyPoint ? `Lobby: ${data.lobbyPoint}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    const customerEmail =
      typeof data.customerEmail === "string" ? data.customerEmail : undefined;
    const customerName =
      typeof data.customerName === "string" ? data.customerName : "Customer";

    try {
      await sendAdminNewOrderNotice({
        customerName,
        items,
        deliveryLocation: deliveryLocation || "—",
        total,
        orderId: opts.orderId,
      });
    } catch (err) {
      console.error("admin paid-order notice failed", err);
    }

    if (customerEmail) {
      try {
        await sendOrderConfirmation(customerEmail, opts.orderId, items, total);
      } catch (err) {
        console.error("customer paid confirmation failed", err);
      }
    }

    const recipients = await listUserAlertRecipients();
    const envRunners = (process.env.RUNNER_ALERT_EMAIL ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    const byEmail = new Map<string, { email: string; isRunner: boolean }>();
    for (const r of recipients) {
      if (customerEmail && r.email === customerEmail) continue;
      byEmail.set(r.email, r);
    }
    for (const email of envRunners) {
      if (customerEmail && email === customerEmail) continue;
      const existing = byEmail.get(email);
      byEmail.set(email, { email, isRunner: existing?.isRunner ?? true });
    }

    await mapPool([...byEmail.values()], 5, async (person) => {
      if (person.isRunner) {
        await sendRunnerNotification(
          person.email,
          opts.orderId,
          FUSION_PICKUP_LOCATION,
        );
      } else {
        await sendNonRunnerOrderNudge(
          person.email,
          opts.orderId,
          FUSION_PICKUP_LOCATION,
        );
      }
    });

    await ref.update({ airwallexPaidNotifiedAt: now, updatedAt: now });
    notified = true;
  }

  return {
    updated: !alreadyPaid || prevStatus === "pending",
    notified,
    prevStatus,
  };
}
