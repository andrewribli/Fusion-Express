"use client";

import { useEffect, useState } from "react";
import {
  formatRemaining,
  isRunnerDeliveryExpired,
  runnerDeadlineOf,
  customerDeadlineOf,
  isRunnerDeliveryOpen,
  isCustomerPaymentOpen,
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

  if (party === "runner" && isRunnerDeliveryOpen(order.status)) {
    const due = runnerDeadlineOf(order);
    if (!due) return null;
    const expired = isRunnerDeliveryExpired(order, now);
    const remaining = due.getTime() - now;
    return (
      <p
        className={`rounded-xl px-3 py-2 text-sm ${
          expired
            ? "bg-red-950 text-red-100"
            : remaining <= 30 * 60_000
              ? "bg-amber-950 text-amber-100"
              : "bg-[#2a2418] text-[#f5e6c8]"
        }`}
      >
        {expired
          ? "Delivery deadline passed — complete ASAP."
          : `Deliver within ${formatRemaining(remaining)}`}
      </p>
    );
  }

  if (party === "customer" && isCustomerPaymentOpen(order.status)) {
    const due = customerDeadlineOf(order);
    if (!due) return null;
    const remaining = due.getTime() - now;
    return (
      <p className="rounded-xl bg-[#2a2418] px-3 py-2 text-sm text-[#f5e6c8]">
        {remaining <= 0
          ? "Payment overdue — pay GraceRun ASAP."
          : `Pay within ${formatRemaining(remaining)}`}
      </p>
    );
  }

  return null;
}
