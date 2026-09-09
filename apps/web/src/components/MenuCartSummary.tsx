"use client";

import Link from "next/link";
import { CustomItemCard } from "@/components/CustomItemCard";
import { useCart } from "@/context/CartContext";
import { lineTotal } from "@/lib/pricing";

export function MenuCartSummary() {
  const { items, itemCount, subtotal, setQuantity, removeItem } = useCart();

  return (
    <aside className="space-y-3">
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
        <div className="flex items-center justify-between bg-[#ED1C24] px-4 py-3 text-white">
          <h2 className="text-sm font-bold">Your order</h2>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-gray-500">
            Add products to see your order here.
          </p>
        ) : (
          <ul className="max-h-[45vh] divide-y divide-gray-100 overflow-y-auto">
            {items.map(({ item, quantity }) => (
              <li key={item.id} className="px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-xs font-semibold text-gray-900">
                    {item.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-[10px] text-gray-400 hover:text-[#ED1C24]"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center rounded-lg bg-gray-100">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.id, quantity - 1)}
                      className="h-7 w-7 text-sm font-bold text-[#ED1C24]"
                      aria-label={`Remove one ${item.name}`}
                    >
                      −
                    </button>
                    <span className="min-w-6 text-center text-xs font-bold">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(item.id, quantity + 1)}
                      className="h-7 w-7 text-sm font-bold text-[#ED1C24]"
                      aria-label={`Add one ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs font-bold text-gray-900">
                    ${lineTotal(item, quantity)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-gray-100 p-3">
          <div className="flex justify-between text-sm font-bold text-gray-900">
            <span>Subtotal</span>
            <span>${subtotal}</span>
          </div>
          <Link
            href={itemCount > 0 ? "/cart" : "/menu"}
            className={`mt-3 block rounded-xl py-3 text-center text-sm font-bold ${
              itemCount > 0
                ? "bg-[#ED1C24] text-white"
                : "pointer-events-none bg-gray-100 text-gray-400"
            }`}
          >
            Review order
          </Link>
        </div>
      </section>

      <CustomItemCard />
    </aside>
  );
}
