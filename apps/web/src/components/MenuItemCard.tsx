"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { MenuItem } from "@/lib/types";
import { formatMenuPrice } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { getItemImage } from "@/data/aisle-images";
import { ProductQuickAddModal } from "@/components/ProductQuickAddModal";

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const { items, setQuantity } = useCart();
  const inCart = items.find((c) => c.item.id === item.id);
  const quantity = inCart?.quantity ?? 0;
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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
          {quantity > 0 ? (
            <span className="absolute right-1 top-1 rounded-full bg-[#ED1C24] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {quantity}
            </span>
          ) : null}
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
          ) : quantity > 0 ? (
            <div
              className="mt-2 flex items-center justify-between rounded-lg px-1.5 py-1"
              style={{ backgroundColor: "#fef2f2" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setQuantity(item.id, quantity - 1)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold shadow-sm"
                style={{ backgroundColor: "#ffffff", color: "#ED1C24" }}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="text-sm font-semibold" style={{ color: "#111111" }}>
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(item.id, quantity + 1)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-base font-bold text-white shadow-sm"
                style={{ backgroundColor: "#ED1C24" }}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <p className="mt-2 text-[10px] font-semibold" style={{ color: "#9ca3af" }}>
              {isMobile ? "Tap for details" : "Tap to add"}
            </p>
          )}
        </div>
      </div>

      <ProductQuickAddModal item={item} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
