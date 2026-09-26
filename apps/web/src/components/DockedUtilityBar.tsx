"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { useActiveCustomerOrders } from "@/lib/use-active-orders";

/**
 * Docked bar above the bottom nav — replaces floating Track Order / Feedback pills
 * so they no longer cover product cards.
 */
export function DockedUtilityBar({
  showFeedback = true,
  onFeedback,
}: {
  showFeedback?: boolean;
  onFeedback?: () => void;
}) {
  const pathname = usePathname();
  const { mode } = useUser();
  const { itemCount } = useCart();
  const { count, href } = useActiveCustomerOrders();

  const hideTrack =
    mode === "runner" ||
    count < 1 ||
    pathname.startsWith("/track") ||
    pathname.startsWith("/orders");

  if (hideTrack && !showFeedback) return null;

  const bottom = itemCount > 0 ? "bottom-[7.25rem]" : "bottom-[3.5rem]";

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-40 md:hidden ${bottom}`}
    >
      <div className="pointer-events-auto mx-auto flex max-w-[480px] items-stretch gap-2 px-3 pb-2">
        {!hideTrack ? (
          <Link
            href={href}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#ED1C24] px-4 text-sm font-bold text-white shadow-md"
          >
            Track Order
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-[#ED1C24]">
              {count > 9 ? "9+" : count}
            </span>
          </Link>
        ) : null}
        {showFeedback ? (
          <button
            type="button"
            onClick={onFeedback}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl bg-[#111827] px-4 text-sm font-semibold text-white shadow-md"
            aria-label="Give feedback"
          >
            Feedback
          </button>
        ) : null}
      </div>
    </div>
  );
}
