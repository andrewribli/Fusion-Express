"use client";

import Image from "next/image";
import type { MenuItem } from "@/lib/types";
import { formatHkd, formatMenuPrice } from "@/lib/types";
import { ProductCardQtyControl } from "@/components/ProductCardQtyControl";

export function ProductRailCard({
  item,
  badge,
}: {
  item: MenuItem;
  badge?: string;
}) {
  const onSale = item.salePrice != null && item.salePrice < item.price;

  return (
    <div className="relative flex w-[148px] shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-left sm:w-[160px]">
      <div className="relative aspect-square w-full bg-gray-50">
        {item.image ? (
          <Image
            src={item.image}
            alt=""
            fill
            className="object-contain p-3"
            sizes="160px"
          />
        ) : null}
        {badge ? (
          <span className="absolute left-2 top-2 z-[1] rounded-md bg-[#ED1C24] px-1.5 py-0.5 text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
        <ProductCardQtyControl item={item} size="sm" />
      </div>
      <div className="flex flex-col gap-1 px-2.5 pb-3 pt-2">
        <p className="line-clamp-2 min-h-[2.4rem] text-[12px] font-semibold leading-snug text-gray-900">
          {item.name}
        </p>
        <div className="flex flex-wrap items-baseline gap-1.5">
          <p className="text-base font-extrabold leading-none text-[#ED1C24]">
            {formatMenuPrice(item)}
          </p>
          {onSale ? (
            <p className="text-[11px] text-gray-400 line-through">
              {formatHkd(item.price)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
