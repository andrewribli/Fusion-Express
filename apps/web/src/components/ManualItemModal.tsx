"use client";

import { useEffect } from "react";
import { ManualItemForm } from "@/components/ManualItemForm";

export function ManualItemModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add item manually"
        className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
        style={{ backgroundColor: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div>
            <h2 className="text-base font-bold" style={{ color: "#111111" }}>
              Can&apos;t find what you&apos;re looking for?
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: "#6b7280" }}>
              Add it manually and we&apos;ll add it to your cart.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl font-light"
            style={{ backgroundColor: "#f3f4f6", color: "#111111" }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-4 py-4">
          <ManualItemForm onAdded={onClose} />
        </div>
      </div>
    </div>
  );
}
