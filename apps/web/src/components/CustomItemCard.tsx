"use client";

import { useManualItemModal } from "@/lib/manual-item-modal";

/** Opens the shared manual-add modal (same as the Add tab). */
export function CustomItemCard({ className = "" }: { className?: string }) {
  const { openManualItem } = useManualItemModal();

  return (
    <section
      className={`shop-bubble overflow-hidden rounded-2xl shadow-sm ${className}`}
      style={{ backgroundColor: "#ED1C24" }}
    >
      <button
        type="button"
        onClick={openManualItem}
        className="group flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
      >
        <span>
          <span
            className="shop-heading block text-sm font-semibold"
            style={{ color: "#ffffff" }}
          >
            Can&apos;t find your item?
          </span>
          <span className="shop-muted mt-0.5 block text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>
            Add your own and the runner will find it at Fusion.
          </span>
        </span>
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl font-bold"
          style={{ backgroundColor: "#ffffff", color: "#ED1C24" }}
        >
          +
        </span>
      </button>
    </section>
  );
}
