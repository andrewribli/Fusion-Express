"use client";

import { useState } from "react";
import Image from "next/image";
import type { MenuItem } from "@/lib/types";
import { formatMenuPrice } from "@/lib/types";
import { getItemImage } from "@/data/aisle-images";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { formatSaleLabel, hasSale } from "@/lib/pricing";
import { ProductCardQtyControl } from "@/components/ProductCardQtyControl";
import { ProductQuickAddModal } from "@/components/ProductQuickAddModal";

interface ItemListRowProps {
  item: MenuItem;
}

export function ItemListRow({ item }: ItemListRowProps) {
  const [fav, setFav] = useState(() => isFavorite(item.id));
  const [open, setOpen] = useState(false);

  return (
    <>
      <li
        role="button"
        tabIndex={item.inStock ? 0 : -1}
        onClick={() => {
          if (!item.inStock) return;
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (item.inStock && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white/95 text-left shadow-sm transition-shadow hover:shadow-md ${
          item.inStock ? "cursor-pointer" : "cursor-not-allowed opacity-60"
        }`}
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
          <ProductCardQtyControl item={item} size="sm" />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-gray-900">
                {item.name}
              </h3>
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
        </div>
      </li>
      <ProductQuickAddModal item={item} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
