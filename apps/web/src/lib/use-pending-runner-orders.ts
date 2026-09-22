"use client";

import { useEffect, useState } from "react";
import { getUserAccountId, useUser } from "@/context/UserContext";
import { formatDeliveryAddress } from "@/data/cuhk-locations";
import { subscribePendingOrders } from "@/lib/orders";

export type PendingQueueItem = {
  id: string;
  dorm: string;
};

async function fetchPendingQueue(): Promise<PendingQueueItem[]> {
  try {
    const res = await fetch("/api/runner/pending-count", {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      orders?: { id?: string; college?: string; hall?: string }[];
    };
    return (data.orders ?? [])
      .map((row) => {
        const id = String(row.id ?? "").trim();
        if (!id) return null;
        const dorm =
          formatDeliveryAddress(
            String(row.college ?? ""),
            String(row.hall ?? ""),
          ) || "Dorm TBD";
        return { id, dorm };
      })
      .filter((row): row is PendingQueueItem => Boolean(row));
  } catch {
    return [];
  }
}

/**
 * Live claimable runner-queue orders (pending, unassigned).
 * Runners get Firestore onSnapshot; everyone else polls the public count API
 * (client rules block non-runners from listing the job board).
 */
export function usePendingRunnerOrders(): {
  count: number;
  orders: PendingQueueItem[];
} {
  const { user } = useUser();
  const [orders, setOrders] = useState<PendingQueueItem[]>([]);

  useEffect(() => {
    if (user?.isRunner) {
      const excludeCustomerId = getUserAccountId(user);
      return subscribePendingOrders(
        (next) => {
          setOrders(
            next.map((order) => ({
              id: order.id,
              dorm:
                formatDeliveryAddress(order.college, order.hall) || "Dorm TBD",
            })),
          );
        },
        {
          excludeCustomerId,
          onError: () => {
            void fetchPendingQueue().then(setOrders);
          },
        },
      );
    }

    let cancelled = false;
    async function load() {
      const next = await fetchPendingQueue();
      if (!cancelled) setOrders(next);
    }
    void load();
    const interval = window.setInterval(() => void load(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

  return { count: orders.length, orders };
}

/** @deprecated prefer usePendingRunnerOrders().count */
export function usePendingRunnerOrderCount(): number {
  return usePendingRunnerOrders().count;
}
