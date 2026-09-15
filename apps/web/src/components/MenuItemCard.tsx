"use client";

import Image from "next/image";
import { useState } from "react";
import type { MenuItem } from "@/lib/types";
import { formatMenuPrice } from "@/lib/types";
import { getItemImage } from "@/data/aisle-images";
import { ProductCardQtyControl } from "@/components/ProductCardQtyControl";
import { ProductQuickAddModal } from "@/components/ProductQuickAddModal";

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const [open, setOpen] = useState(false);

  function onCardActivate() {
    if (!item.inStock) return;
    setOpen(true);
  }

  return (
    <>
      <div
        role="button"
        tabIndex={item.inStock ? 0 : -1}
        onClick={onCardActivate}
        onKeyDown={(e) => {
          if (item.inStock && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onCardActivate();
          }
        }}
        className={`shop-surface flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 text-left shadow-sm transition-shadow hover:shadow-md ${
          item.inStock ? "cursor-pointer" : "cursor-not-allowed opacity-60"
        }`}
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="relative aspect-square w-full" style={{ backgroundColor: "#fafafa" }}>
          {getItemImage(item) ? (
            <Image
              src={getItemImage(item)}
              alt={item.name}
              fill
              className="object-contain p-2"
              sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
            />
          ) : null}
          <ProductCardQtyControl item={item} />
        </div>
        <div className="flex flex-1 flex-col p-2.5">
          <h3
            className="line-clamp-2 text-xs font-semibold leading-snug"
            style={{ color: "#111111" }}
          >
            {item.name}
          </h3>
          <p className="shop-muted mt-0.5 text-xs" style={{ color: "#9ca3af" }}>
            per {item.unit}
          </p>
          <p className="mt-1 text-sm font-bold leading-tight" style={{ color: "#ED1C24" }}>
            {formatMenuPrice(item)}
          </p>
          {item.runnerInputsPrice && (
            <p className="mt-0.5 text-[10px] text-amber-600">Price confirmed at pickup</p>
          )}
          {!item.inStock ? (
            <p className="mt-2 text-xs font-semibold" style={{ color: "#9ca3af" }}>
              Out of stock
            </p>
          ) : null}
        </div>
      </div>

      <ProductQuickAddModal item={item} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
