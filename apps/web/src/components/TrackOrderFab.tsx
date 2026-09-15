"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useActiveCustomerOrders } from "@/lib/use-active-orders";

export function TrackOrderFab() {
  const pathname = usePathname();
  const { mode } = useUser();
  const { count, href } = useActiveCustomerOrders();

  if (mode === "runner" || count < 1) return null;
  if (pathname.startsWith("/track") || pathname.startsWith("/orders")) return null;

  return (
    <Link
      href={href}
      className="fixed bottom-[5.75rem] left-1/2 z-40 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-[#ED1C24] px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-[#d11920] md:bottom-6"
    >
      Track Order
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-[#ED1C24]">
        {count > 9 ? "9+" : count}
      </span>
    </Link>
  );
}
