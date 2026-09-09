"use client";

import Image from "next/image";
import type { MenuItem } from "@/lib/types";
import { formatMenuPrice } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { getItemImage } from "@/data/aisle-images";

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const { items, addItem, setQuantity } = useCart();
  const inCart = items.find((c) => c.item.id === item.id);
  const quantity = inCart?.quantity ?? 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
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
      </div>
      <div className="flex flex-1 flex-col p-2.5">
        <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-gray-900">
          {item.name}
        </h3>
        <p className="mt-0.5 text-xs text-gray-400">per {item.unit}</p>
        <p className="mt-1 text-sm font-bold leading-tight text-fusion-red">
          {formatMenuPrice(item)}
        </p>
        {item.runnerInputsPrice && (
          <p className="mt-0.5 text-[10px] text-amber-600">Price confirmed at pickup</p>
        )}
      {quantity === 0 ? (
        <button
          type="button"
          onClick={() => addItem(item)}
          disabled={!item.inStock}
          className="mt-2 w-full rounded-lg bg-fusion-red py-1.5 text-xs font-semibold text-lakers-navy transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          {item.inStock ? "Add to Cart" : "Out of stock"}
        </button>
      ) : (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-red-50 px-1.5 py-1">
          <button
            type="button"
            onClick={() => setQuantity(item.id, quantity - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-base font-bold text-fusion-red shadow-sm"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="text-sm font-semibold text-gray-800">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(item.id, quantity + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-fusion-red text-base font-bold text-white shadow-sm"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
