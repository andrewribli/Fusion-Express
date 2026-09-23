"use client";

import type { MenuItem } from "@/ptero/lib/types";
import { useCart } from "@/ptero/context/CartContext";

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

  const btnVisual = size === "sm" ? "h-8 w-8 text-base" : "h-9 w-9 text-lg";
  const hit = "min-h-11 min-w-11";
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
        className={`absolute bottom-0.5 right-0.5 z-10 flex ${hit} items-center justify-center`}
        aria-label={`Add ${item.name} to cart`}
      >
        <span
          className={`flex ${btnVisual} items-center justify-center rounded-full font-bold shadow-md`}
          style={{ backgroundColor: "#ED1C24", color: "#ffffff" }}
          aria-hidden
        >
          +
        </span>
      </button>
    );
  }

  return (
    <div
      className="absolute bottom-0.5 right-0.5 z-10 flex min-h-11 items-center gap-0.5 rounded-full px-0.5 shadow-md"
      style={{ backgroundColor: "#ffffff" }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <button
        type="button"
        onClick={() => setQuantity(item.id, quantity - 1)}
        className={`flex ${hit} items-center justify-center rounded-full font-bold`}
        style={{ color: "#ED1C24" }}
        aria-label="Decrease quantity"
      >
        <span className={btnVisual} aria-hidden>
          −
        </span>
      </button>
      <span
        className={`min-w-5 text-center font-extrabold tabular-nums ${qtyText}`}
        style={{ color: "#111111" }}
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => setQuantity(item.id, quantity + 1)}
        className={`flex ${hit} items-center justify-center rounded-full font-bold text-white`}
        aria-label="Increase quantity"
      >
        <span
          className={`flex ${btnVisual} items-center justify-center rounded-full`}
          style={{ backgroundColor: "#ED1C24" }}
          aria-hidden
        >
          +
        </span>
      </button>
    </div>
  );
}
