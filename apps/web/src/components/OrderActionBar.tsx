"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { resolveOrderDeliveryFee } from "@/lib/order-delivery";
import { isOverOrderLimit } from "@/lib/constants";
import { OrderLimitNotice } from "@/components/OrderLimitNotice";
import { getCanteenCheckoutGate, isCanteenCart } from "@/lib/canteen/cart";
import { useIsAdmin } from "@/lib/use-is-admin";
import { useUser } from "@/context/UserContext";

function checkoutReason(
  message: string | null,
  mixed: boolean,
): string | null {
  if (mixed) return "Please order from one canteen at a time.";
  return message;
}

export function OrderActionBar({
  orderingEnabled = true,
}: {
  orderingEnabled?: boolean;
}) {
  const router = useRouter();
  const { user } = useUser();
  const isAdmin = useIsAdmin(user?.uid);
  const { itemCount, subtotal, items } = useCart();
  const fee = resolveOrderDeliveryFee(items, "");
  const overLimit = isOverOrderLimit(subtotal);
  const canteenGate = getCanteenCheckoutGate(items, { adminBypass: isAdmin });
  const canteenBlocked =
    isCanteenCart(items) && !canteenGate.allowed && !canteenGate.hoursClosed;
  const checkoutEnabled =
    !canteenBlocked && (orderingEnabled || isAdmin || canteenGate.hoursClosed);

  if (itemCount === 0) return null;

  const mixed = Boolean(
    canteenGate.message?.toLowerCase().includes("different canteens"),
  );
  const reason = checkoutReason(canteenGate.message, mixed);
  const showClosed =
    canteenGate.hoursClosed && !isAdmin && Boolean(canteenGate.message);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(7.75rem+env(safe-area-inset-bottom,0px))] z-40 md:bottom-4 xl:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-lg flex-col gap-2">
        <OrderLimitNotice subtotal={subtotal} />
        {showClosed ? (
          <p className="rounded-2xl bg-amber-50 px-3 py-2 text-center text-base font-medium text-amber-950">
            {canteenGate.message}
          </p>
        ) : null}
        {!checkoutEnabled && reason ? (
          <p className="rounded-2xl bg-amber-50 px-3 py-2 text-center text-base font-medium text-amber-950">
            {reason}
          </p>
        ) : null}
        {mixed ? (
          <Link
            href="/cart"
            className="flex min-h-11 items-center justify-center rounded-full bg-white px-4 text-base font-bold text-gray-900 shadow-lg ring-1 ring-gray-200"
          >
            View cart
          </Link>
        ) : (
          <button
            type="button"
            disabled={overLimit || !checkoutEnabled}
            onClick={() => {
              if (!checkoutEnabled) return;
              router.push("/checkout");
            }}
            className="flex min-h-11 w-full items-center justify-center rounded-full px-4 text-base font-bold text-white shadow-lg disabled:opacity-50"
            style={{ backgroundColor: checkoutEnabled ? "#ED1C24" : "#9ca3af" }}
          >
            {checkoutEnabled
              ? `Continue to checkout · $${subtotal + fee.deliveryFee}`
              : reason ?? "Add items to place an order"}
          </button>
        )}
      </div>
    </div>
  );
}
