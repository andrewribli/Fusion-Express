"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import {
  CUSTOM_ITEM_DEFAULT_WEIGHT_KG,
  RUNNER_JUDGMENT_NOTE,
} from "@/lib/constants";
import { createCustomMenuItem } from "@/lib/custom-item";
import { useCampus } from "@/context/CampusContext";
import { cartCampus } from "@/lib/cart-campus";
import { campusConfig } from "@fusion-express/shared/campus";

export function ManualItemForm({
  className = "",
  onAdded,
}: {
  className?: string;
  onAdded?: () => void;
}) {
  const { addItem, items } = useCart();
  const { campus: activeCampus } = useCampus();
  const campus = cartCampus(items) ?? activeCampus;
  const store = campusConfig[campus].supermarket;
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const parsed = Number.parseFloat(price);
    const estimatedPrice =
      Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    addItem(
      createCustomMenuItem(trimmed, { estimatedPrice, campus }),
      Math.max(1, qty),
    );
    setAdded(trimmed);
    setName("");
    setPrice("");
    setQty(1);
    onAdded?.();
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <label htmlFor="manual-item-name" className="block text-xs font-medium text-gray-600">
        Item name
      </label>
      <input
        id="manual-item-name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setAdded("");
        }}
        placeholder='e.g. "Shin Ramyun"'
        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20"
        autoFocus
      />

      <label
        htmlFor="manual-item-price"
        className="mt-3 block text-xs font-medium text-gray-600"
      >
        Estimated price (optional)
      </label>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
          HK$
        </span>
        <input
          id="manual-item-price"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.1"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g. 12"
          className="w-full rounded-xl border border-gray-200 py-2.5 pl-12 pr-3 text-sm focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20"
        />
      </div>

      <label className="mt-3 block text-xs font-medium text-gray-600">Quantity</label>
      <div className="mt-1 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setQty((n) => Math.max(1, n - 1))}
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold"
          style={{ backgroundColor: "#f3f4f6", color: "#ED1C24" }}
          aria-label="Decrease quantity"
        >
          −
        </button>
        <span className="min-w-8 text-center text-lg font-bold" style={{ color: "#111111" }}>
          {qty}
        </span>
        <button
          type="button"
          onClick={() => setQty((n) => n + 1)}
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold text-white"
          style={{ backgroundColor: "#ED1C24" }}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      <button
        type="submit"
        disabled={!name.trim()}
        className="mt-4 min-h-12 w-full rounded-full text-sm font-bold text-white disabled:opacity-50"
        style={{ backgroundColor: "#ED1C24" }}
      >
        Add to Cart
      </button>
      {added && (
        <p className="mt-2 text-xs font-medium text-green-700">
          Added “{added}” to your cart.
        </p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        The runner will find this item at {store}. If it&apos;s not available, they&apos;ll
        use their best judgment. Custom items count as {CUSTOM_ITEM_DEFAULT_WEIGHT_KG}{" "}
        kg for the delivery-fee estimate. {RUNNER_JUDGMENT_NOTE}.
      </p>
    </form>
  );
}
