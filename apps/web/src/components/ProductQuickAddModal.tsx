"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getItemImage } from "@/data/aisle-images";
import { useCart } from "@/context/CartContext";
import { formatMenuPrice, type MenuItem } from "@/lib/types";

function priceLabel(item: MenuItem): string {
  const raw = formatMenuPrice(item);
  return raw.startsWith("HK") ? raw : `HK${raw}`;
}

export function ProductQuickAddModal({
  item,
  open,
  onClose,
}: {
  item: MenuItem;
  open: boolean;
  onClose: () => void;
}) {
  const { items, addItem, setQuantity } = useCart();
  const inCart = items.find((c) => c.item.id === item.id);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!open) return;
    setQty(Math.max(1, inCart?.quantity ?? 1));
  }, [open, item.id, inCart?.quantity]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const image = getItemImage(item);

  function addToCart() {
    if (!item.inStock) return;
    if (inCart) {
      setQuantity(item.id, qty);
    } else {
      addItem(item, qty);
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
        style={{ backgroundColor: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-square w-full" style={{ backgroundColor: "#fafafa" }}>
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              className="object-contain p-5"
              sizes="400px"
            />
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full text-2xl font-light"
            style={{ backgroundColor: "#ffffff", color: "#111111", boxShadow: "0 1px 6px rgba(0,0,0,0.15)" }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <h3 className="text-lg font-bold leading-snug" style={{ color: "#111111" }}>
              {item.name}
            </h3>
            <p className="mt-1 text-sm" style={{ color: "#6b7280" }}>
              per {item.unit}
            </p>
            <p className="mt-2 text-2xl font-extrabold" style={{ color: "#ED1C24" }}>
              {priceLabel(item)}
            </p>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setQty((n) => Math.max(1, n - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold"
              style={{ backgroundColor: "#f3f4f6", color: "#ED1C24" }}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="min-w-8 text-center text-xl font-bold" style={{ color: "#111111" }}>
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((n) => n + 1)}
              className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold text-white"
              style={{ backgroundColor: "#ED1C24" }}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            type="button"
            disabled={!item.inStock}
            onClick={addToCart}
            className="min-h-12 w-full rounded-full text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: "#ED1C24" }}
          >
            {item.inStock ? "Add to Cart" : "Out of stock"}
          </button>
        </div>
      </div>
    </div>
  );
}
