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
  const line =
    items.find((c) => c.item.id === item.id) ??
    items.find(
      (c) => c.item.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
    );
  const quantity = line?.quantity ?? 0;
  const cartId = line?.item.id ?? item.id;

  if (!item.inStock) return null;

  // Same reserved slot for + and stepper so cards don't shift.
  const slot =
    "absolute bottom-0.5 right-0.5 z-10 flex h-11 w-[6.75rem] items-center justify-end";
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
        className={slot}
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
      className={`${slot} gap-0.5 rounded-full shadow-md`}
      style={{ backgroundColor: "#ffffff" }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <button
        type="button"
        onClick={() => setQuantity(cartId, quantity - 1)}
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
        onClick={() => setQuantity(cartId, quantity + 1)}
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
