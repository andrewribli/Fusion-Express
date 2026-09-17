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

  // Sit above the Complete bar when the cart is non-empty so the two never overlap.
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
        {count > 9 ? "9+" : count}
      </span>
    </Link>
  );
}
