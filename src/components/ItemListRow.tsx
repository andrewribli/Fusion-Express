"use client";

import { useState } from "react";
import type { MenuItem } from "@/lib/types";
import { formatMenuPrice } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { formatSaleLabel, hasSale } from "@/lib/pricing";

interface ItemListRowProps {
  item: MenuItem;
}

export function ItemListRow({ item }: ItemListRowProps) {
  const { items, addItem, setQuantity } = useCart();
  const inCart = items.find((c) => c.item.id === item.id);
  const quantity = inCart?.quantity ?? 0;
  const [fav, setFav] = useState(() => isFavorite(item.id));

  return (
    <li className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{item.name}</h3>
            <button
              type="button"
              onClick={() => setFav(toggleFavorite(item.id))}
              className="shrink-0 text-xl leading-none"
              aria-label={fav ? "Remove from favorites" : "Add to favorites"}
            >
              {fav ? "❤️" : "🤍"}
            </button>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">per {item.unit}</p>
          <p className="mt-2 text-base font-bold text-fusion-red">
            {formatMenuPrice(item)}
            {hasSale(item) && (
              <span className="ml-2 text-xs font-normal text-gray-400 line-through">
                ${item.price}
              </span>
            )}
          </p>
          {formatSaleLabel(item) && (
            <p className="mt-0.5 text-xs font-medium text-amber-700">
              {formatSaleLabel(item)}
            </p>
          )}
          {item.runnerInputsPrice && (
            <p className="mt-1 text-xs text-amber-700">
              Price varies by weight. Runner will confirm exact price.
            </p>
          )}
        </div>
      </div>

      {quantity === 0 ? (
        <button
          type="button"
          onClick={() => addItem(item)}
          className="mt-3 w-full rounded-xl bg-fusion-red py-3 text-sm font-semibold text-white active:scale-[0.98]"
        >
          Add to Cart
        </button>
      ) : (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-red-50 px-3 py-2">
          <button
            type="button"
            onClick={() => setQuantity(item.id, quantity - 1)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-bold text-fusion-red shadow-sm"
          >
            −
          </button>
          <span className="text-base font-bold text-gray-900">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(item.id, quantity + 1)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-fusion-red text-xl font-bold text-white shadow-sm"
          >
            +
          </button>
        </div>
      )}
    </li>
  );
}
