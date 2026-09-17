"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useUser, getUserAccountId } from "@/context/UserContext";
import { loadAllProducts } from "@/lib/firestore";
import { fetchOrdersByCustomer } from "@/lib/orders";
import { menuItemFromOrderLine } from "@/lib/reorder";
import type { MenuItem } from "@/lib/types";

interface PreviousLine {
  item: MenuItem;
  quantity: number;
}

export function PreviousOrderChecklist() {
  const { user } = useUser();
  const { items: cartItems, addItem, removeItem } = useCart();
  const [lines, setLines] = useState<PreviousLine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setLines([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const accountId = getUserAccountId(user);
        const [orders, catalog] = await Promise.all([
          fetchOrdersByCustomer(accountId),
          loadAllProducts(),
        ]);
        const last = orders.find((order) => order.customerId === accountId);
        if (cancelled) return;
        if (!last) {
          setLines([]);
          return;
        }
        setLines(
          last.items.map((line) => ({
            item: menuItemFromOrderLine(line, catalog),
            quantity: line.quantity,
          })),
        );
      } catch (err) {
        console.error("[previous-order] load failed", err);
        if (!cancelled) setLines([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const cartIds = useMemo(
    () => new Set(cartItems.map((entry) => entry.item.id)),
    [cartItems],
  );

  if (!user || loading || lines.length === 0) return null;

  function toggleInCart(line: PreviousLine, inCart: boolean) {
    if (inCart) {
      removeItem(line.item.id);
      return;
    }
    addItem(line.item, line.quantity);
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
      <div className="bg-[#552583] px-4 py-3 text-white">
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
                onChange={() => toggleInCart(line, inCart)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#ED1C24]"
                aria-label={`${inCart ? "Remove" : "Add"} ${line.item.name}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-xs font-semibold text-gray-900">
                    {line.quantity}× {line.item.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      removeItem(line.item.id);
                      setLines((prev) => prev.filter((entry) => entry.item.id !== line.item.id));
                    }}
                    className="text-[10px] text-gray-400 hover:text-[#ED1C24]"
                  >
                    Remove
                  </button>
                </div>
                <p className="mt-1 text-xs font-bold text-gray-900">${line.item.price}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-gray-100 p-3">
        <button
          type="button"
          onClick={reorderAll}
          className="w-full rounded-xl bg-[#552583] py-2.5 text-sm font-bold text-white"
        >
          Reorder All
        </button>
      </div>
    </section>
  );
}
