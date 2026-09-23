"use client";

import { useMemo } from "react";
import { useAppState, useUser } from "@/context/AppState";
import { useCart } from "@/context/CartContext";
import { getCanteenMenuItem } from "@/config/canteen/menus";
import { getProduct } from "@/config/products";
import { CAMPUS_ID } from "@/config/campus";
import {
  parseCanteenItemId,
  toCartMenuItem,
} from "@/lib/canteen/cart";
import type { MenuItem, OrderItem } from "@/lib/types";
import { resolveOrderChannel } from "@/lib/types";

type Props = {
  channel?: "taste" | "canteen";
};

function menuItemFromOrderLine(line: OrderItem): MenuItem {
  const canteen = parseCanteenItemId(line.itemId);
  if (canteen) {
    const menu = getCanteenMenuItem(canteen.restaurantId, canteen.itemId);
    if (menu) return toCartMenuItem(canteen.restaurantId, menu);
  }
  const product = getProduct(line.itemId);
  if (product) return product;
  return {
    id: line.itemId,
    campus: CAMPUS_ID,
    name: line.name,
    category: "other",
    price: line.price,
    unit: "each",
    image: line.image,
    priceType: "fixed",
    runnerInputsPrice: false,
    inStock: true,
    sortOrder: 0,
    weightKg: line.weightKg ?? 0.2,
  };
}

/**
 * Previous-order checklist with add/remove checkboxes — mirrors gracerun.fit.
 */
export function PreviousOrderChecklist({ channel = "taste" }: Props) {
  const { user } = useUser();
  const { orders } = useAppState();
  const { items: cartItems, addItem, removeItem } = useCart();

  const lines = useMemo(() => {
    if (!user) return [];
    const last = orders.find(
      (o) =>
        o.customerId === user.uid &&
        resolveOrderChannel(o) === channel &&
        o.items.length > 0,
    );
    if (!last) return [];
    return last.items.map((line) => ({
      item: menuItemFromOrderLine(line),
      quantity: line.quantity,
    }));
  }, [orders, user, channel]);

  const cartIds = useMemo(
    () => new Set(cartItems.map((entry) => entry.item.id)),
    [cartItems],
  );

  if (!user || lines.length === 0) return null;

  function toggleInCart(item: MenuItem, quantity: number, inCart: boolean) {
    if (inCart) {
      removeItem(item.id);
      return;
    }
    addItem(item, quantity);
  }

  function reorderAll() {
    for (const line of lines) {
      if (!cartIds.has(line.item.id)) {
        addItem(line.item, line.quantity);
      }
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
      <div className="bg-[#1a1a1a] px-4 py-3 text-white">
        <h2 className="text-sm font-bold">Previous order</h2>
        <p className="mt-0.5 text-[11px] text-white/85">
          Would you like to order these same items?
        </p>
      </div>

      <ul className="max-h-[28vh] divide-y divide-gray-100 overflow-y-auto">
        {lines.map((line) => {
          const inCart = cartIds.has(line.item.id);
          return (
            <li key={line.item.id} className="flex items-start gap-2 px-3 py-3">
              <input
                type="checkbox"
                checked={inCart}
                onChange={() => toggleInCart(line.item, line.quantity, inCart)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#ED1C24]"
                aria-label={`${inCart ? "Remove" : "Add"} ${line.item.name}`}
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-semibold text-gray-900">
                  {line.quantity}× {line.item.name}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  HK${line.item.price.toFixed(2)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-gray-100 p-3">
        <button
          type="button"
          onClick={reorderAll}
          className="w-full rounded-xl bg-[#ED1C24] py-2.5 text-xs font-bold text-white"
        >
          Add all to cart
        </button>
      </div>
    </section>
  );
}
