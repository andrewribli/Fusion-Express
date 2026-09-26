"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAppState, useUser } from "@/ptero/context/AppState";
import { useCart } from "@/ptero/context/CartContext";

const ACTIVE = new Set(["pending", "accepted", "purchased", "delivered"]);

/** Docked Track Order bar above bottom nav — no floating pill over cards. */
export function TrackOrderFab() {
  const pathname = usePathname();
  const { mode, user } = useUser();
  const { orders } = useAppState();
  const { itemCount } = useCart();

  const active = useMemo(() => {
    if (!user) return [];
    return orders.filter(
      (o) => o.customerId === user.uid && ACTIVE.has(o.status),
    );
  }, [orders, user]);

  if (mode === "runner" || active.length < 1) return null;
  if (pathname.startsWith("/cityu/track") || pathname.startsWith("/cityu/orders")) return null;
  if (pathname.startsWith("/cityu/runner") || pathname.startsWith("/cityu/login")) return null;

  const href =
    active.length === 1 ? `/cityu/track/${active[0].id}` : "/cityu/orders";
  const bottom = itemCount > 0 ? "bottom-[7.25rem]" : "bottom-[3.5rem]";

  return (
    <div className={`fixed inset-x-0 z-40 px-3 pb-2 md:hidden ${bottom}`}>
      <Link
        href={href}
        className="mx-auto flex min-h-11 max-w-[480px] items-center justify-center gap-2 rounded-2xl bg-[#ED1C24] px-4 text-sm font-bold text-white shadow-md"
      >
        Track Order
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-[#ED1C24]">
          {active.length > 9 ? "9+" : active.length}
        </span>
      </Link>
    </div>
  );
}
