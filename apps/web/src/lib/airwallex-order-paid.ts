import "server-only";
import { getOrderRest, patchOrderRest } from "@/lib/firestore-rest";

const PAID_STATUSES = new Set([
  "paid",
  "customer_paid",
  "runner_paid",
  "completed",
]);

/**
 * Mark a delivered order paid after Airwallex confirms the receipt total.
 * Does not notify runners — they already have the order from placement.
 */
export async function markOrderPaidFromAirwallex(opts: {
  orderId: string;
  intentId: string;
  amount: number;
  currency: string;
  webhookEventId?: string | null;
}): Promise<{ updated: boolean; prevStatus: string }> {
  const data = await getOrderRest(opts.orderId);
  if (!data) throw new Error("Order not found");

  const prevStatus = String(data.status ?? "");
  if (PAID_STATUSES.has(prevStatus) || data.paymentReceived === true) {
    return { updated: false, prevStatus };
  }
  if (prevStatus !== "delivered") {
    throw new Error(
      `Refusing to mark paid from status "${prevStatus}". Payment is only after delivery.`,
    );
  }

  const now = new Date();
  await patchOrderRest(opts.orderId, {
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

  return { updated: true, prevStatus };
}
