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
    <li
      role="button"
      tabIndex={0}
      onClick={() => addItem(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          addItem(item);
        }
      }}
      className="flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border border-gray-100 bg-white/95 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative h-20 w-full bg-white sm:h-24">
        {getItemImage(item) ? (
          <Image
            src={getItemImage(item)}
            alt={item.name}
            fill
            className="object-contain p-1"
            sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
          />
        ) : null}
        {quantity > 0 ? (
          <span className="absolute right-1 top-1 rounded-full bg-[#ED1C24] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {quantity}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-gray-900">{item.name}</h3>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFav(toggleFavorite(item.id));
              }}
              className="shrink-0 text-xs font-semibold text-fusion-red"
              aria-label={fav ? "Remove from favorites" : "Add to favorites"}
            >
              {fav ? "Saved" : "Save"}
            </button>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            per {item.unit} · ~{item.weightKg} kg
          </p>
          <p className="mt-1 text-sm font-bold text-fusion-red">
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
              Price varies. Runner will confirm exact price.
            </p>
          )}
          {item.itemNote && (
            <p className="mt-1 text-xs text-amber-700">{item.itemNote}</p>
          )}
        </div>

        {quantity > 0 ? (
          <div className="mt-auto flex items-center justify-between rounded-lg bg-red-50 px-2 py-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQuantity(item.id, quantity - 1);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-lg font-bold text-fusion-red shadow-sm"
            >
              −
            </button>
            <span className="text-base font-bold text-gray-900">{quantity}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQuantity(item.id, quantity + 1);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-fusion-red text-lg font-bold text-white shadow-sm"
            >
              +
            </button>
          </div>
        ) : (
          <p className="mt-auto text-[10px] font-semibold text-gray-400">Tap to add</p>
        )}
      </div>
    </li>
  );
}
