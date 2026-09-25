"use client";

import {
  GROCERY_SOURCE_LIST,
  type GrocerySourceId,
} from "@/lib/grocerySources";

export function GrocerySourcePicker({
  selected,
  onSelect,
}: {
  selected: GrocerySourceId | null;
  onSelect: (id: GrocerySourceId) => void;
}) {
  return (
    <section className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-[1400px] px-3 py-3 sm:px-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Choose a store
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {GROCERY_SOURCE_LIST.map((store) => {
            const active = selected === store.id;
            return (
              <button
                key={store.id}
                type="button"
                onClick={() => onSelect(store.id)}
                className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                  active
                    ? "border-[#ED1C24] bg-red-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{store.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      store.tier === "premium"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {store.tier === "premium" ? "Premium" : "Value"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {store.walkMinutes} min walk · HK${store.deliveryFee} delivery
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
