"use client";

import { useEffect, useState } from "react";
import {
  CUSTOMER_DEADLINE_WARNING,
  customerDeadlineOf,
  formatRemaining,
  isCustomerPaymentOpen,
  isRunnerDeliveryOpen,
  RUNNER_DEADLINE_WARNING,
  runnerDeadlineOf,
} from "@/lib/order-status";
import type { Order } from "@/lib/types";

export function DeadlineBanner({
  order,
  party,
}: {
  order: Order;
  party: "runner" | "customer";
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (party === "runner") {
    if (!isRunnerDeliveryOpen(order.status)) return null;
    const due = runnerDeadlineOf(order);
    if (!due) return null;
    const remaining = due.getTime() - now;
    const expired = remaining <= 0 || Boolean(order.runnerExpiredAt);
    return (
      <div
        className="mt-3 rounded-xl px-3 py-2 text-sm"
        style={{
          backgroundColor: expired ? "#3a1518" : "rgba(237,28,36,0.16)",
          color: expired ? "#fecaca" : "#ffb4b8",
        }}
      >
        {expired ? (
          <p className="font-semibold">{RUNNER_DEADLINE_WARNING}</p>
        ) : (
          <p className="font-bold">Time remaining: {formatRemaining(remaining)}</p>
        )}
      </div>
    );
  }

  if (!isCustomerPaymentOpen(order.status)) return null;
  const due = customerDeadlineOf(order);
  if (!due) return null;
  const remaining = due.getTime() - now;
  const overdue = remaining <= 0 || Boolean(order.customerOverdueAt);
  return (
    <div
      className="mt-3 rounded-xl px-3 py-2 text-sm"
      style={{
        backgroundColor: overdue ? "#3a1518" : "rgba(237,28,36,0.16)",
        color: overdue ? "#fecaca" : "#ffb4b8",
      }}
    >
      {overdue ? (
        <p className="font-semibold">{CUSTOMER_DEADLINE_WARNING}</p>
      ) : (
        <p className="font-bold">Pay within {formatRemaining(remaining)}</p>
      )}
    </div>
  );
}
