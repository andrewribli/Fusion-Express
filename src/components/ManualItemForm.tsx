"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { RUNNER_JUDGMENT_NOTE } from "@/lib/constants";
import { createCustomMenuItem } from "@/lib/custom-item";

export function ManualItemForm({ className = "" }: { className?: string }) {
  const { addItem } = useCart();
  const [name, setName] = useState("");
  const [weightKg, setWeightKg] = useState("0.3");
  const [added, setAdded] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    const weight = Number(weightKg);
    if (!trimmed) return;
    if (!Number.isFinite(weight) || weight <= 0) return;
    addItem(createCustomMenuItem(trimmed, weight));
    setAdded(trimmed);
    setName("");
    setWeightKg("0.3");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-2xl border-2 border-dashed border-fusion-red/50 bg-white p-4 shadow-sm ${className}`}
    >
      <p className="text-sm font-bold text-gray-900">Not on the menu?</p>
      <p className="mt-1 text-sm text-gray-600">
        Add your item manually. The runner will find it at Fusion.
      </p>

      <label htmlFor="manual-item-name" className="mt-3 block text-xs font-medium text-gray-600">
        What should we pick up?
      </label>
      <input
        id="manual-item-name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setAdded("");
        }}
        placeholder="e.g. 1 biggest Pocari Sweat, or a bag of ice"
        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20"
      />

      <label htmlFor="manual-item-weight" className="mt-3 block text-xs font-medium text-gray-600">
        Approx. weight (kg) — used for delivery fee
      </label>
      <input
        id="manual-item-weight"
        type="number"
        min={0.05}
        step={0.05}
        value={weightKg}
        onChange={(e) => setWeightKg(e.target.value)}
        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20"
      />

      <button
        type="submit"
        disabled={!name.trim() || Number(weightKg) <= 0}
        className="mt-3 w-full rounded-xl bg-fusion-red py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        Add this item to my order
      </button>
      {added && (
        <p className="mt-2 text-xs font-medium text-green-700">Added “{added}” to your cart.</p>
      )}
      <p className="mt-2 text-xs text-gray-500">{RUNNER_JUDGMENT_NOTE}</p>
    </form>
  );
}
