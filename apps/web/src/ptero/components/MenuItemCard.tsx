"use client";

import Image from "next/image";
import type { MenuItem } from "@/ptero/lib/types";
import { formatHkd, formatMenuPrice } from "@/ptero/lib/types";
import { ProductCardQtyControl } from "@/ptero/components/ProductCardQtyControl";

export function MenuItemCard({ item }: { item: MenuItem }) {
  const onSale = item.salePrice != null && item.salePrice < item.price;

  return (
    <div
      className={`shop-surface flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 text-left shadow-sm transition-shadow hover:shadow-md ${
        item.inStock ? "" : "opacity-60"
      }`}
      style={{ backgroundColor: "#ffffff" }}
    >
      <div className="relative aspect-square w-full" style={{ backgroundColor: "#fafafa" }}>
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-contain p-2"
            sizes="(min-width: 768px) 33vw, 50vw"
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
          {item.grocerySource ? item.category : `per ${item.unit}`}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
          {item.grocerySource ? (
            <p className="text-xs font-bold leading-tight" style={{ color: "#ED1C24" }}>
              Est. {formatMenuPrice(item)} — confirmed at pickup.
            </p>
          ) : (
            <p className="text-sm font-bold leading-tight" style={{ color: "#ED1C24" }}>
              {formatMenuPrice(item)}
            </p>
          )}
          {onSale ? (
            <p className="text-[11px] text-gray-400 line-through">{formatHkd(item.price)}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
