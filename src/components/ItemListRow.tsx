"use client";

import { useState } from "react";
import Image from "next/image";
import type { MenuItem } from "@/lib/types";
import { formatMenuPrice } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { getItemImage } from "@/data/aisle-images";
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
    <li className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white/95 shadow-sm">
      <div className="relative h-28 w-full bg-white">
        <Image
          src={getItemImage(item)}
          alt={item.name}
          fill
          className="object-contain p-1"
          sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{item.name}</h3>
            <button
              type="button"
              onClick={() => setFav(toggleFavorite(item.id))}
              className="shrink-0 text-xs font-semibold text-fusion-red"
              aria-label={fav ? "Remove from favorites" : "Add to favorites"}
            >
              {fav ? "Saved" : "Save"}
            </button>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            per {item.unit} · ~{item.weightKg} kg
          </p>
          <p className="mt-2 text-base font-bold text-fusion-red">
            {formatMenuPrice(item)}
            <span className="ml-1 text-xs font-normal text-gray-400">est.</span>
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
              Price varies. Runner will confirm exact price.
            </p>
          )}
          {item.itemNote && (
            <p className="mt-1 text-xs text-amber-700">{item.itemNote}</p>
          )}
        </div>

      {quantity === 0 ? (
        <button
          type="button"
          onClick={() => addItem(item)}
          className="mt-auto w-full rounded-xl bg-fusion-red py-3 text-sm font-semibold text-white active:scale-[0.98]"
        >
          Add to Cart
        </button>
      ) : (
        <div className="mt-auto flex items-center justify-between rounded-xl bg-red-50 px-3 py-2">
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
      </div>
    </li>
  );
}
