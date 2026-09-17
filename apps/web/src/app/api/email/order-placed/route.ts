import { NextResponse } from "next/server";
import {
  FUSION_PICKUP_LOCATION,
  sendNonRunnerOrderNudge,
  sendOrderConfirmation,
  sendRunnerNotification,
  type OrderEmailItem,
} from "@/lib/email";
import { listUserAlertRecipients } from "@/lib/firebase-admin";

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
  let body: {
    customerEmail?: string;
    orderId?: string;
    items?: OrderEmailItem[];
    total?: number;
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

  const items = Array.isArray(body.items) ? body.items : [];
  const total = Number(body.total ?? 0);
  const customerEmail = body.customerEmail?.trim().toLowerCase();

  try {
    if (customerEmail) {
      await sendOrderConfirmation(customerEmail, orderId, items, total);
    }

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
          orderId,
          FUSION_PICKUP_LOCATION,
        );
      } else {
        await sendNonRunnerOrderNudge(
          person.email,
          orderId,
          FUSION_PICKUP_LOCATION,
        );
      }
    });

    return NextResponse.json({ ok: true, alerted: byEmail.size });
  } catch (err) {
    console.error("order-placed email failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send email" },
      { status: 502 },
    );
  }
}
