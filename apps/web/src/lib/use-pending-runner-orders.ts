"use client";

import { useEffect, useState } from "react";
import { resolveCampus, type CampusId } from "@fusion-express/shared/campus";
import { getUserAccountId, useUser } from "@/context/UserContext";
import { useCampus } from "@/context/CampusContext";
import { formatDeliveryAddress } from "@/data/cuhk-locations";
import { subscribePendingOrders } from "@/lib/orders";

export type PendingQueueItem = {
  id: string;
  dorm: string;
};

async function fetchPendingQueue(campus: CampusId): Promise<PendingQueueItem[]> {
  try {
    const res = await fetch(`/api/runner/pending-count?campus=${campus}`, {
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
 * Live claimable runner-queue orders (pending, unassigned) on the viewer's
 * campus. Runners get Firestore onSnapshot; everyone else polls the public
 * count API (client rules block non-runners from listing the job board).
 */
export function usePendingRunnerOrders(): {
  count: number;
  orders: PendingQueueItem[];
} {
  const { user } = useUser();
  const { campus: activeCampus } = useCampus();
  const campus = user?.campus ? resolveCampus(user.campus) : activeCampus;
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
          excludeCustomerEmail: user.email,
          campus,
          onError: () => {
            void fetchPendingQueue(campus).then(setOrders);
          },
        },
      );
    }

    let cancelled = false;
    async function load() {
      const next = await fetchPendingQueue(campus);
      if (!cancelled) setOrders(next);
    }
    void load();
    const interval = window.setInterval(() => void load(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user, campus]);

  return { count: orders.length, orders };
}

/** @deprecated prefer usePendingRunnerOrders().count */
export function usePendingRunnerOrderCount(): number {
  return usePendingRunnerOrders().count;
}
