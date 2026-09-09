"use client";

import { useState } from "react";
import { ManualItemForm } from "@/components/ManualItemForm";

/** Custom item request — shop sidebar, cart, and checkout. */
export function CustomItemCard({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ED1C24]"
      >
        <span>
          <span className="block text-sm font-semibold text-gray-900 transition-colors group-hover:text-[#ED1C24]">
            Can&apos;t find your item?
          </span>
          <span className="mt-0.5 block text-xs text-gray-500">
            Add your own and the runner will find it at Fusion.
          </span>
        </span>
        <span
          aria-hidden
          className={`shrink-0 text-lg text-fusion-red transition-transform ${
            open ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          <ManualItemForm />
        </div>
      )}
    </section>
  );
}
