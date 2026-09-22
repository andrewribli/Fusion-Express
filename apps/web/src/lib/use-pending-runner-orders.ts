"use client";

import { useEffect, useState } from "react";
import { getUserAccountId, useUser } from "@/context/UserContext";
import { subscribePendingOrders } from "@/lib/orders";

async function fetchPendingCount(): Promise<number> {
  try {
    const res = await fetch("/api/runner/pending-count", {
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { count?: number };
    return typeof data.count === "number" ? data.count : 0;
  } catch {
    return 0;
  }
}

/**
 * Live count of claimable runner-queue orders (pending, unassigned).
 * Runners get Firestore onSnapshot; everyone else polls the admin count API
 * (client rules block non-runners from listing the job board).
 */
export function usePendingRunnerOrderCount(): number {
  const { user } = useUser();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (user?.isRunner) {
      const excludeCustomerId = getUserAccountId(user);
      return subscribePendingOrders(
        (orders) => {
          setCount(orders.length);
        },
        {
          excludeCustomerId,
          onError: () => {
            void fetchPendingCount().then(setCount);
          },
        },
      );
    }

    let cancelled = false;
    async function load() {
      const next = await fetchPendingCount();
      if (!cancelled) setCount(next);
    }
    void load();
    const interval = window.setInterval(() => void load(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

  return count;
}
