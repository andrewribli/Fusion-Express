"use client";

import { useEffect } from "react";
import {
  isRunnerDeliveryOpen,
  runnerDeadlineOf,
  RUNNER_DEADLINE_REMINDER_MS,
} from "@/lib/order-status";
import type { Order } from "@/lib/types";

/** Poll runner deadlines so the UI can refresh countdown banners. */
export function useDeadlineWatch(orders: Order[]): void {
  useEffect(() => {
    const needsWatch = orders.some(
      (order) =>
        isRunnerDeliveryOpen(order.status) && runnerDeadlineOf(order) != null,
    );
    if (!needsWatch) return;
    const interval = window.setInterval(() => {
      /* Re-render consumers that read Date.now() on an interval. */
    }, RUNNER_DEADLINE_REMINDER_MS / 6);
    return () => window.clearInterval(interval);
  }, [orders]);
}
