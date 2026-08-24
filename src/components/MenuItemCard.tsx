"use client";

import Image from "next/image";
import type { MenuItem } from "@/lib/types";
import { formatMenuPrice } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { getCategoryImage } from "@/data/aisle-images";

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const { items, addItem, setQuantity } = useCart();
  const inCart = items.find((c) => c.item.id === item.id);
  const quantity = inCart?.quantity ?? 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="relative h-28 w-full">
        <Image
          src={getCategoryImage(item.category)}
          alt=""
          fill
          className="object-cover"
          sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
        />
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-semibold leading-snug text-gray-900">
          {item.name}
        </h3>
        <p className="mt-0.5 text-xs text-gray-400">per {item.unit}</p>
        <p className="mt-2 text-sm font-bold leading-tight text-fusion-red">
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
          className="mt-3 w-full rounded-xl bg-fusion-red py-2 text-sm font-semibold text-lakers-navy transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          {item.inStock ? "Add to Cart" : "Out of stock"}
        </button>
      ) : (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-red-50 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setQuantity(item.id, quantity - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-lg font-bold text-fusion-red shadow-sm"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="text-sm font-semibold text-gray-800">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(item.id, quantity + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-fusion-red text-lg font-bold text-white shadow-sm"
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
