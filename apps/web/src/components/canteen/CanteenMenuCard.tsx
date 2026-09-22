"use client";

import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { formatHkd } from "@/data/canteen/bf-menu";
import type { MenuItem as BfItem } from "@/data/canteen/bf-menu";
import type { SimpleMenuItem } from "@/data/canteen/simple-menu";
import type { UcMenuItem } from "@/data/canteen/uc-menu";
import type { RestaurantId } from "@/data/canteen/restaurants";
import {
  toCartMenuItemFromBf,
  toCartMenuItemFromSimple,
  toCartMenuItemFromUc,
} from "@/lib/canteen/cart";

type Props =
  | { kind: "bf"; item: BfItem; restaurantId: "benjamin-franklin" }
  | { kind: "uc"; item: UcMenuItem; restaurantId: "uc-canteen" }
  | {
      kind: "simple";
      item: SimpleMenuItem;
      restaurantId: "cu-cafe" | "sh-ho-canteen" | "paper-and-coffee";
    };

export function CanteenMenuCard(props: Props) {
  const { items, addItem, setQuantity } = useCart();
  const cartItem =
    props.kind === "bf"
      ? toCartMenuItemFromBf(props.item, props.restaurantId)
      : props.kind === "uc"
        ? toCartMenuItemFromUc(props.item, props.restaurantId)
        : toCartMenuItemFromSimple(props.item, props.restaurantId);
  const qty = items.find((c) => c.item.id === cartItem.id)?.quantity ?? 0;
  const name = props.item.name;
  const nameZh = props.kind === "uc" ? props.item.nameZh : undefined;
  const description =
    props.kind === "uc" || props.kind === "bf" || props.kind === "simple"
      ? props.item.description
      : undefined;
  const image =
    props.kind === "bf" || props.kind === "simple"
      ? props.item.image
      : undefined;
  const signature = props.kind === "simple" ? props.item.signature : false;
  const restaurantId: RestaurantId = props.restaurantId;

  return (
    <article className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      {image ? (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-50">
          <Image
            src={image}
            alt={name}
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-50 to-gray-50 text-xl font-bold text-[#ED1C24]/80">
          {name.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-semibold leading-snug text-gray-900">
                {name}
              </h3>
              {signature ? (
                <span className="rounded-md bg-[#ED1C24]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#ED1C24]">
                  Signature
                </span>
              ) : null}
            </div>
            {nameZh ? (
              <p className="mt-0.5 text-xs text-gray-500">{nameZh}</p>
            ) : null}
          </div>
          <p className="shrink-0 text-sm font-bold text-[#ED1C24]">
            {formatHkd(props.item.price)}
          </p>
        </div>
        {description ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-gray-500">
            {description}
          </p>
        ) : null}
        <div className="mt-2 flex justify-end">
          {qty === 0 ? (
            <button
              type="button"
              onClick={() => addItem(cartItem)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ED1C24] text-lg font-bold leading-none text-white hover:bg-[#c9161d]"
              aria-label={`Add ${name}`}
            >
              +
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-1 py-0.5">
              <button
                type="button"
                aria-label={`Decrease ${name}`}
                onClick={() => setQuantity(cartItem.id, qty - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-800 hover:bg-white"
              >
                −
              </button>
              <span className="min-w-5 text-center text-sm font-semibold text-gray-900">
                {qty}
              </span>
              <button
                type="button"
                aria-label={`Increase ${name}`}
                onClick={() => addItem(cartItem)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-800 hover:bg-white"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
      <span className="sr-only">{restaurantId}</span>
    </article>
  );
}
