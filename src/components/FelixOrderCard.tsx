"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import {
  buildFelixSuggestedCart,
  describeFelixOrder,
  felixOrderSubtotal,
} from "@/lib/felix-order";
import { formatSaleLabel } from "@/lib/pricing";
import { DELIVERY_FEE } from "@/lib/types";

export function FelixOrderCard() {
  const router = useRouter();
  const { replaceCart } = useCart();
  const cart = useMemo(() => buildFelixSuggestedCart(), []);
  const description = useMemo(() => describeFelixOrder(cart), [cart]);
  const subtotal = felixOrderSubtotal(cart);
  const saleLabel = cart[0] ? formatSaleLabel(cart[0].item) : null;

  if (cart.length === 0) return null;

  function handleOrder() {
    replaceCart(cart);
    router.push("/cart");
  }

  return (
    <section className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        Popular order
      </p>
      <h2 className="mt-1 text-base font-bold text-gray-900">Shin Ramyun run</h2>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
      {saleLabel && (
        <p className="mt-1 text-xs font-medium text-fusion-red">Deal: {saleLabel}</p>
      )}
      <p className="mt-2 text-sm text-gray-500">
        + ${DELIVERY_FEE} delivery · est. total ${subtotal + DELIVERY_FEE} (prices
        not accurate yet)
      </p>
      <button
        type="button"
        onClick={handleOrder}
        className="mt-3 w-full rounded-xl bg-fusion-red py-3 text-sm font-semibold text-white"
      >
        Add to Cart &amp; Checkout
      </button>
    </section>
  );
}
