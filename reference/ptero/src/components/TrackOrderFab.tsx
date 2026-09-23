"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAppState, useUser } from "@/context/AppState";
import { useCart } from "@/context/CartContext";

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
  if (pathname.startsWith("/track") || pathname.startsWith("/orders")) return null;
  if (pathname.startsWith("/runner") || pathname.startsWith("/login")) return null;

  const href =
    active.length === 1 ? `/track/${active[0].id}` : "/orders";
  const bottomClass =
    itemCount > 0
      ? "bottom-[9.75rem] md:bottom-24"
      : "bottom-[5.75rem] md:bottom-6";

  return (
    <Link
      href={href}
      className={`fixed left-3 z-40 flex min-h-11 items-center gap-2 rounded-full bg-[#ED1C24] px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-[#d11920] sm:left-1/2 sm:-translate-x-1/2 ${bottomClass}`}
    >
      Track Order
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-[#ED1C24]">
        {active.length > 9 ? "9+" : active.length}
      </span>
    </Link>
  );
}
