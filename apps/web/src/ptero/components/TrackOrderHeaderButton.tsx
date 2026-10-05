"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppState, useUser } from "@/ptero/context/AppState";

const ACTIVE = new Set(["pending", "accepted", "purchased", "delivered"]);

export function TrackOrderHeaderButton() {
  const { user } = useUser();
  const { orders } = useAppState();
  const active = useMemo(() => {
    if (!user) return [];
    return orders.filter((o) => o.customerId === user.uid && ACTIVE.has(o.status));
  }, [orders, user]);

  if (active.length < 1) return null;

  const href =
    active.length === 1 ? `/cityu/track/${active[0].id}` : "/cityu/orders";

  return (
    <Link
      href={href}
      aria-label={`Track ${active.length} active ${active.length === 1 ? "order" : "orders"}`}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 sm:h-11 sm:w-11"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
      >
        <path d="M3 7h11v10H3zM14 11h4l3 3v3h-7" />
        <circle cx="7.5" cy="18.5" r="1.6" />
        <circle cx="17.5" cy="18.5" r="1.6" />
      </svg>
      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ED1C24] px-1 text-[10px] font-bold leading-none text-white">
        {active.length > 9 ? "9+" : active.length}
      </span>
    </Link>
  );
}
