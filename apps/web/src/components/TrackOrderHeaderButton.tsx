"use client";

import Link from "next/link";
import { useActiveCustomerOrders } from "@/lib/use-active-orders";

export function TrackOrderHeaderButton() {
  const { count, href } = useActiveCustomerOrders();
  if (count < 1) return null;

  return (
    <Link
      href={href}
      aria-label={`Track ${count} active ${count === 1 ? "order" : "orders"}`}
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
        {count > 9 ? "9+" : count}
      </span>
    </Link>
  );
}
