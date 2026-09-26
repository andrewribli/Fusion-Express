"use client";

import { useEffect, useState } from "react";

export type DishDetailModel = {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string | null;
  drinkAddonPrice?: number;
};

/**
 * Lightweight item detail / add-on modal opened from meal-search deep links.
 */
export function CanteenDishDetailModal({
  item,
  open,
  onClose,
  onAdd,
  orderingEnabled = true,
}: {
  item: DishDetailModel | null;
  open: boolean;
  onClose: () => void;
  onAdd: (item: DishDetailModel, qty: number) => void;
  orderingEnabled?: boolean;
}) {
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!open) return;
    setQty(1);
  }, [open, item?.id]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !item) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[4/3] w-full bg-gray-50">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-[#ED1C24]/40">
              {item.name.slice(0, 1)}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl font-light shadow"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <h3 className="text-lg font-bold leading-snug text-gray-900">
              {item.name}
            </h3>
            {item.description ? (
              <p className="mt-1 text-sm text-gray-600">{item.description}</p>
            ) : null}
            <p className="mt-2 text-base font-bold text-[#ED1C24]">
              Est. HK$
              {Number.isInteger(item.price)
                ? item.price
                : item.price.toFixed(1)}
            </p>
            {typeof item.drinkAddonPrice === "number" ? (
              <p className="mt-1 text-xs font-medium text-gray-600">
                Add a drink +HK${item.drinkAddonPrice}
              </p>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-2 py-1">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold"
              >
                −
              </button>
              <span className="min-w-6 text-center text-sm font-semibold">
                {qty}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty((q) => q + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold"
              >
                +
              </button>
            </div>
            <button
              type="button"
              disabled={!orderingEnabled}
              onClick={() => {
                if (!orderingEnabled) return;
                onAdd(item, qty);
                onClose();
              }}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold text-white ${
                orderingEnabled
                  ? "bg-[#ED1C24] hover:bg-[#c9161d]"
                  : "cursor-not-allowed bg-gray-300"
              }`}
            >
              {orderingEnabled ? "Add to cart" : "Closed"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
