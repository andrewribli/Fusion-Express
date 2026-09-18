"use client";

import { useState } from "react";
import { imageForOrderLine } from "@/lib/order-item-image";
import type { OrderItem } from "@/lib/types";

export function RunnerOrderItemList({
  items,
  dark = false,
}: {
  items: OrderItem[];
  dark?: boolean;
}) {
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null);

  return (
    <>
      <ul className="space-y-2">
        {items.map((item) => {
          const src = imageForOrderLine(item);
          return (
            <li
              key={`${item.itemId}-${item.name}`}
              className={`flex items-center gap-3 rounded-xl px-2 py-2 ${
                dark ? "bg-[#2a2a2a]" : "bg-gray-50"
              }`}
            >
              {src ? (
                <button
                  type="button"
                  onClick={() => setZoom({ src, alt: item.name })}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white"
                  aria-label={`View larger photo of ${item.name}`}
                >
                  {/* Native img: catalog hosts vary and next/image fill was clipping on mobile. */}
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                </button>
              ) : (
                <span
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-[10px] ${
                    dark ? "bg-[#3a3a3a] text-[#c4c4c4]" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  No photo
                </span>
              )}
              <p
                className={`min-w-0 flex-1 text-sm font-medium ${
                  dark ? "text-white" : "text-gray-900"
                }`}
              >
                {item.quantity}× {item.name}
                {item.weightKg != null && (
                  <span
                    className={`mt-0.5 block text-xs font-normal ${
                      dark ? "text-[#c4c4c4]" : "text-gray-500"
                    }`}
                  >
                    {item.quantity > 1
                      ? `${item.weightKg} kg each`
                      : `${item.weightKg} kg`}
                  </span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
      {zoom && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoom(null)}
          role="dialog"
          aria-modal="true"
          aria-label={zoom.alt}
        >
          <button
            type="button"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white"
            aria-label="Close image"
            onClick={() => setZoom(null)}
          >
            ×
          </button>
          <img
            src={zoom.src}
            alt={zoom.alt}
            className="max-h-[85vh] max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
