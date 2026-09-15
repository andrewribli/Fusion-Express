"use client";

import type { MenuItem } from "@/lib/types";
import { useCart } from "@/context/CartContext";

/** Mannings-style + / quantity control, pinned to the product image corner. */
export function ProductCardQtyControl({
  item,
  size = "md",
}: {
  item: MenuItem;
  size?: "sm" | "md";
}) {
  const { items, addItem, setQuantity } = useCart();
  const quantity = items.find((c) => c.item.id === item.id)?.quantity ?? 0;

  if (!item.inStock) return null;

  const btn = size === "sm" ? "h-8 w-8 text-base" : "h-9 w-9 text-lg";
  const pillPad = size === "sm" ? "h-8 gap-1.5 px-1" : "h-9 gap-1.5 px-1";
  const qtyText = size === "sm" ? "text-xs" : "text-sm";

  if (quantity <= 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          addItem(item);
        }}
        className={`absolute bottom-1.5 right-1.5 z-10 flex ${btn} items-center justify-center rounded-full font-bold shadow-md`}
        style={{ backgroundColor: "#ED1C24", color: "#ffffff" }}
        aria-label={`Add ${item.name} to cart`}
      >
        +
      </button>
    );
  }

  return (
    <div
      className={`absolute bottom-1.5 right-1.5 z-10 flex ${pillPad} items-center rounded-full shadow-md`}
      style={{ backgroundColor: "#ffffff" }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <button
        type="button"
        onClick={() => setQuantity(item.id, quantity - 1)}
        className={`flex ${btn} items-center justify-center rounded-full font-bold`}
        style={{ color: "#ED1C24" }}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span
        className={`min-w-4 text-center font-bold tabular-nums ${qtyText}`}
        style={{ color: "#111111" }}
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => setQuantity(item.id, quantity + 1)}
        className={`flex ${btn} items-center justify-center rounded-full font-bold text-white`}
        style={{ backgroundColor: "#ED1C24" }}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
