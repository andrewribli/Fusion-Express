"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAppState, useUser } from "@/ptero/context/AppState";
import { useCart } from "@/ptero/context/CartContext";

const ACTIVE = new Set(["pending", "accepted", "purchased", "delivered"]);

/** Floating Track Order chip — mirrors gracerun.fit TrackOrderFab. */
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
  const aboveNav = !pathname.startsWith("/cityu/canteen");
  const activeLabel =
    active.length === 1 ? "1 active order" : `${active.length} active orders`;

  return (
    <Link
      href={href}
      aria-label={`Track Order, ${activeLabel}`}
      className={`fixed left-4 z-30 flex min-h-11 items-center gap-2 rounded-full bg-[#ED1C24] px-4 py-2.5 text-base font-bold text-white shadow-lg hover:bg-[#d11920] ${
        !aboveNav
          ? "bottom-[max(1rem,env(safe-area-inset-bottom,0px))]"
          : itemCount > 0
            ? "bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:bottom-28"
            : "bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:bottom-6"
      }`}
    >
      Track Order
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-[#ED1C24]">
        {active.length > 9 ? "9+" : active.length}
      </span>
    </Link>
  );
}
