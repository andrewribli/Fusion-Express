"use client";

import { useManualItemModal } from "@/lib/manual-item-modal";

/** Opens the shared manual-add modal (same as the Add tab). */
export function CustomItemCard({ className = "" }: { className?: string }) {
  const { openManualItem } = useManualItemModal();

  return (
    <section
      className={`shop-surface overflow-hidden rounded-2xl border border-gray-100 shadow-sm ${className}`}
      style={{ backgroundColor: "#ffffff" }}
    >
      <button
        type="button"
        onClick={openManualItem}
        className="group flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ED1C24]"
      >
        <span>
          <span
            className="block text-sm font-semibold transition-colors group-hover:text-[#ED1C24]"
            style={{ color: "#111111" }}
          >
            Can&apos;t find your item?
          </span>
          <span className="shop-muted mt-0.5 block text-xs" style={{ color: "#6b7280" }}>
            Add your own and the runner will find it at Fusion.
          </span>
        </span>
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
          style={{ backgroundColor: "#ED1C24" }}
        >
          +
        </span>
      </button>
    </section>
  );
}
