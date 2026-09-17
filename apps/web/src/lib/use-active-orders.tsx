"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useUser, getUserAccountId } from "@/context/UserContext";
import { fetchActiveCustomerOrders } from "@/lib/orders";
import type { Order } from "@/lib/types";

type ActiveOrdersValue = {
  orders: Order[];
  count: number;
  href: string;
};

const EMPTY: ActiveOrdersValue = {
  orders: [],
  count: 0,
  href: "/track",
};

const ActiveOrdersContext = createContext<ActiveOrdersValue>(EMPTY);

export function ActiveOrdersProvider({ children }: { children: ReactNode }) {
  const { user, mode } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user || mode === "runner") {
      setOrders([]);
      return;
    }
    const accountId = getUserAccountId(user);
    let cancelled = false;

    async function load() {
      try {
        const next = await fetchActiveCustomerOrders(accountId);
        if (!cancelled) setOrders(next);
      } catch {
        if (!cancelled) setOrders([]);
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [user, mode]);

  const value = useMemo<ActiveOrdersValue>(() => {
    const count = orders.length;
    return {
      orders,
      count,
      href:
        count === 1
          ? `/track?orderId=${encodeURIComponent(orders[0].id)}`
          : count > 1
            ? "/orders"
            : "/track",
    };
  }, [orders]);

  return (
    <ActiveOrdersContext.Provider value={value}>
      {children}
    </ActiveOrdersContext.Provider>
  );
}

export function useActiveCustomerOrders(): ActiveOrdersValue {
  return useContext(ActiveOrdersContext);
}
