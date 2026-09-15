"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { MenuItem } from "@/lib/types";
import { formatMenuPrice } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { getItemImage } from "@/data/aisle-images";

interface MenuItemCardProps {
  item: MenuItem;
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const { items, addItem, setQuantity } = useCart();
  const inCart = items.find((c) => c.item.id === item.id);
  const quantity = inCart?.quantity ?? 0;
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function onCardActivate() {
    if (!item.inStock) return;
    if (isMobile) {
      setOpen(true);
      return;
    }
    addItem(item);
  }

  return (
    <>
      <div
        role="button"
        tabIndex={item.inStock ? 0 : -1}
        onClick={onCardActivate}
        onKeyDown={(e) => {
          if (item.inStock && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onCardActivate();
          }
        }}
        className={`flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-white text-left shadow-sm transition-shadow hover:shadow-md ${
          item.inStock ? "cursor-pointer" : "cursor-not-allowed opacity-60"
        }`}
      >
        <div className="relative h-20 w-full bg-white sm:h-24">
          {getItemImage(item) ? (
            <Image
              src={getItemImage(item)}
              alt={item.name}
              fill
              className="object-contain p-1"
              sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
            />
          ) : null}
          {quantity > 0 ? (
            <span className="absolute right-1 top-1 rounded-full bg-[#ED1C24] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {quantity}
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col p-2.5">
          <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-gray-900">
            {item.name}
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">per {item.unit}</p>
          <p className="mt-1 text-sm font-bold leading-tight text-fusion-red">
            {formatMenuPrice(item)}
          </p>
          {item.runnerInputsPrice && (
            <p className="mt-0.5 text-[10px] text-amber-600">Price confirmed at pickup</p>
          )}
          {!item.inStock ? (
            <p className="mt-2 text-xs font-semibold text-gray-400">Out of stock</p>
          ) : quantity > 0 ? (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-red-50 px-1.5 py-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuantity(item.id, quantity - 1);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-base font-bold text-fusion-red shadow-sm"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="text-sm font-semibold text-gray-800">{quantity}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuantity(item.id, quantity + 1);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-fusion-red text-base font-bold text-white shadow-sm"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <p className="mt-2 text-[10px] font-semibold text-gray-400">
              {isMobile ? "Tap for details" : "Tap to add"}
            </p>
          )}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={item.name}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-56 w-full bg-white">
              {getItemImage(item) ? (
                <Image
                  src={getItemImage(item)}
                  alt=""
                  fill
                  className="object-contain p-4"
                  sizes="400px"
                />
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-2xl text-white"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 p-4">
              <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
              <p className="text-sm text-gray-500">per {item.unit}</p>
              <p className="text-2xl font-bold text-[#ED1C24]">
                {formatMenuPrice(item)}
              </p>
              <button
                type="button"
                disabled={!item.inStock}
                onClick={() => {
                  addItem(item);
                  setOpen(false);
                }}
                className="min-h-12 w-full rounded-full bg-[#ED1C24] text-sm font-bold text-white disabled:opacity-50"
              >
                Add to cart
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
