"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomItemCard } from "@/components/CustomItemCard";
import { PreviousOrderChecklist } from "@/components/PreviousOrderChecklist";
import { useCart } from "@/context/CartContext";
import { resolveOrderDeliveryFee } from "@/lib/order-delivery";
import { lineTotal } from "@/lib/pricing";
import { isOverOrderLimit } from "@/lib/constants";
import { OrderLimitNotice } from "@/components/OrderLimitNotice";
import { getCanteenCheckoutGate, isCanteenCart } from "@/lib/canteen/cart";
import { useIsAdmin } from "@/lib/use-is-admin";
import { useUser } from "@/context/UserContext";
import { formatDeliveryQuote } from "@fusion-express/shared/delivery-pricing";

export function MenuCartSummary({
  channel = "fusion",
  orderingEnabled = true,
}: {
  channel?: "fusion" | "canteen";
  orderingEnabled?: boolean;
}) {
  const router = useRouter();
  const { user } = useUser();
  const isAdmin = useIsAdmin(user?.uid);
  const { items, itemCount, subtotal, setQuantity, removeItem } = useCart();

  const fee = resolveOrderDeliveryFee(items, "");
  const total = subtotal + fee.deliveryFee;
  const overLimit = isOverOrderLimit(subtotal);
  const canteenGate = getCanteenCheckoutGate(items, { adminBypass: isAdmin });
  const canteenCheckoutBlocked =
    isCanteenCart(items) && !canteenGate.allowed && !canteenGate.hoursClosed;
  const checkoutBlocked =
    canteenCheckoutBlocked ||
    overLimit ||
    itemCount === 0 ||
    (!orderingEnabled && !isAdmin && !canteenGate.hoursClosed);
  const mixedCart = Boolean(
    canteenGate.message?.toLowerCase().includes("different canteens"),
  );
  const checkoutPauseMessage = mixedCart
    ? "Please order from one canteen at a time."
    : (canteenGate.message ??
      "This canteen is closed — checkout is paused until it opens.");

  function goCheckout() {
    if (checkoutBlocked) return;
    router.push("/checkout");
  }

  return (
    <aside className="space-y-3">
      <section
        className="shop-surface overflow-hidden rounded-2xl border border-gray-100 shadow-lg"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-bold text-gray-900">Your cart</h2>
          <p className="text-xs text-gray-500">
            {itemCount} item{itemCount === 1 ? "" : "s"}
            {channel === "canteen" ? " · Canteen" : ""}
          </p>
        </div>

        <div className="space-y-3 p-4">
          {items.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-base text-gray-600">
                Add items to place an order
              </p>
              <Link
                href={channel === "canteen" ? "/canteen" : "/cuhk"}
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full px-4 text-base font-semibold text-[#ED1C24]"
              >
                Browse the menu
              </Link>
            </div>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {items.map(({ item, quantity }) => (
                <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{item.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity(item.id, quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold"
                      >
                        −
                      </button>
                      <span className="text-xs font-semibold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(item.id, quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold">${lineTotal(item, quantity)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t border-gray-100 p-3">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Subtotal</span>
            <span className={overLimit ? "font-bold text-[#ED1C24]" : undefined}>
              ${subtotal}
            </span>
          </div>
          <div
            className={`flex justify-between text-sm font-bold ${
              overLimit ? "text-[#ED1C24]" : "text-gray-900"
            }`}
          >
            <span>Total (incl. fees)</span>
            <span>${total}</span>
          </div>
          <p className="text-[10px] leading-snug text-gray-500">
            {formatDeliveryQuote(fee.quote)}
          </p>
          <OrderLimitNotice subtotal={subtotal} />
          {(canteenGate.hoursClosed && !isAdmin) ||
          canteenCheckoutBlocked ||
          (!orderingEnabled && !isAdmin) ? (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-base font-medium text-amber-900">
              <p>
                {canteenGate.hoursClosed && !isAdmin
                  ? `${canteenGate.message ?? "This canteen is closed."} You can schedule a later delivery at checkout.`
                  : checkoutPauseMessage}
              </p>
              {mixedCart ? (
                <Link
                  href="/cart"
                  className="mt-2 inline-flex min-h-11 items-center font-semibold text-gray-900 underline"
                >
                  View cart
                </Link>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            disabled={checkoutBlocked}
            onClick={goCheckout}
            className="block w-full rounded-xl bg-[#ED1C24] py-3 text-center text-sm font-bold text-white disabled:bg-gray-100 disabled:text-gray-400"
          >
            Go to checkout
          </button>
          <p className="text-[10px] leading-snug text-gray-500">
            Pay after delivery. Completing an order agrees to our Terms.
          </p>
        </div>
      </section>

      <PreviousOrderChecklist channel={channel} />
      {channel === "fusion" ? <CustomItemCard /> : null}
    </aside>
  );
}
