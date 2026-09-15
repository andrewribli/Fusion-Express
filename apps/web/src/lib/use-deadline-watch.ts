"use client";

import { useEffect } from "react";
import { syncOrderDeadlines } from "@/lib/orders";
import { notifyDeadlineEvent } from "@/lib/notify-email";
import type { Order } from "@/lib/types";

export function useDeadlineWatch(orders: Order[]) {
  const key = orders.map((order) => order.id).join(",");

  useEffect(() => {
    if (orders.length === 0) return;
    let cancelled = false;

    async function tick() {
      for (const order of orders) {
        const result = await syncOrderDeadlines(order);
        if (cancelled) return;
        if (result.runnerReminderDue && order.runnerEmail) {
          void notifyDeadlineEvent({
            kind: "runner_reminder",
            orderId: order.id,
            email: order.runnerEmail,
          });
        }
        if (result.customerReminderDue && order.customerEmail) {
          void notifyDeadlineEvent({
            kind: "customer_reminder",
            orderId: order.id,
            email: order.customerEmail,
          });
        }
        if (result.adminMissedDue) {
          void notifyDeadlineEvent({
            kind: result.runnerExpired
              ? "admin_runner_missed"
              : "admin_customer_missed",
            orderId: order.id,
            email: order.customerEmail,
            extraEmails: order.runnerEmail ? [order.runnerEmail] : [],
          });
        }
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
