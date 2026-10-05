"use client";

import { useState } from "react";
import { CAMPUS_ID } from "@/ptero/config/campus";
import { CAMPUS } from "@/ptero/config/campus";
import { useCart } from "@/ptero/context/CartContext";
import type { MenuItem } from "@/ptero/lib/types";

/** “Can't find your item?” — mirrors gracerun.fit CustomItemCard (local cart). */
export function CustomItemCard({ className = "" }: { className?: string }) {
  const { addItem } = useCart();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const item: MenuItem = {
      id: `custom:${crypto.randomUUID()}`,
      campus: CAMPUS_ID,
      name: trimmed,
      category: "custom",
      price: 0,
      unit: "each",
      description: note.trim() || `Find at ${CAMPUS.supermarket}`,
      priceType: "variable",
      runnerInputsPrice: true,
      inStock: true,
      sortOrder: 999,
      weightKg: 0.3,
    };
    addItem(item, 1);
    setName("");
    setNote("");
    setOpen(false);
  }

  return (
    <>
      <section
        className={`overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-red-50"
        >
          <span>
            <span className="block text-sm font-semibold text-gray-900 group-hover:text-[#ED1C24]">
              Can&apos;t find your item?
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">
              Add your own and the runner will find it at {CAMPUS.supermarket}.
            </span>
          </span>
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ED1C24] text-xl font-bold text-white"
          >
            +
          </span>
        </button>
      </section>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form
            onSubmit={submit}
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
          >
            <h2 className="text-sm font-bold text-gray-900">Add a custom item</h2>
            <p className="mt-1 text-xs text-gray-500">
              Price confirmed by the runner at {CAMPUS.supermarket}.
            </p>
            <label className="mt-3 block text-xs font-medium text-gray-600">
              Item name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Korean pear"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#ED1C24]"
              />
            </label>
            <label className="mt-3 block text-xs font-medium text-gray-600">
              Note for runner (optional)
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Brand, size…"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#ED1C24]"
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-[#ED1C24] py-2.5 text-sm font-bold text-white"
              >
                Add to cart
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
