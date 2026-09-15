"use client";

import { useEffect, useState } from "react";
import {
  fetchOrdersByIds,
  getOrderHistoryIds,
} from "@/lib/orders";
import { isActiveCustomerOrderStatus } from "@/lib/order-status";
import { useUser, getUserAccountId } from "@/context/UserContext";

export function useActiveCustomerOrders(): { href: string; count: number } {
  const { user } = useUser();
  const [count, setCount] = useState(0);
  const [href, setHref] = useState("/track");

  useEffect(() => {
    if (!user) {
      setCount(0);
      setHref("/track");
      return;
    }

    let cancelled = false;

    async function load() {
      const ids = getOrderHistoryIds();
      if (ids.length === 0) {
        if (!cancelled) {
          setCount(0);
          setHref("/track");
        }
        return;
      }
      const orders = await fetchOrdersByIds(ids);
      const customerId = getUserAccountId(user!);
      const active = orders.filter(
        (order) =>
          order.customerId === customerId &&
          isActiveCustomerOrderStatus(order.status),
      );
      if (cancelled) return;
      setCount(active.length);
      setHref(active[0] ? `/track?orderId=${active[0].id}` : "/track");
    }

    void load();
    const interval = window.setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user]);

  return { href, count };
}
