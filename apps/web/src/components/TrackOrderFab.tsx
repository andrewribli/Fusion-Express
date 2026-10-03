"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { useActiveCustomerOrders } from "@/lib/use-active-orders";

export function TrackOrderFab() {
  const pathname = usePathname();
  const { mode } = useUser();
  const { itemCount } = useCart();
  const { count, href } = useActiveCustomerOrders();

  if (mode === "runner" || count < 1) return null;
  if (pathname.startsWith("/track") || pathname.startsWith("/orders")) return null;

  const activeLabel =
    count === 1 ? "1 active order" : `${count} active orders`;

  return (
    <Link
      href={href}
      aria-label={`Track Order, ${activeLabel}`}
      className={`fixed left-4 z-30 flex min-h-11 items-center gap-2 rounded-full bg-[#ED1C24] px-4 py-2.5 text-base font-bold text-white shadow-lg hover:bg-[#d11920] ${
        itemCount > 0 ? "md:bottom-28" : "md:bottom-6"
      } bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))]`}
    >
      Track Order
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-[#ED1C24]">
        {count > 9 ? "9+" : count}
      </span>
    </Link>
  );
}
