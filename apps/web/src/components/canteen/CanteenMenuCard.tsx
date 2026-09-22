"use client";

import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { formatHkd } from "@/data/canteen/bf-menu";
import type { MenuItem as BfItem } from "@/data/canteen/bf-menu";
import type { UcMenuItem } from "@/data/canteen/uc-menu";
import type { RestaurantId } from "@/data/canteen/restaurants";
import {
  toCartMenuItemFromBf,
  toCartMenuItemFromUc,
} from "@/lib/canteen/cart";

type Props =
  | { kind: "bf"; item: BfItem; restaurantId: "benjamin-franklin" }
  | { kind: "uc"; item: UcMenuItem; restaurantId: "uc-canteen" };

export function CanteenMenuCard(props: Props) {
  const { items, addItem, setQuantity } = useCart();
  const cartItem =
    props.kind === "bf"
      ? toCartMenuItemFromBf(props.item, props.restaurantId)
      : toCartMenuItemFromUc(props.item, props.restaurantId);
  const qty = items.find((c) => c.item.id === cartItem.id)?.quantity ?? 0;
  const name = props.item.name;
  const nameZh = props.kind === "uc" ? props.item.nameZh : undefined;
  const description = props.item.description;
  const image = props.kind === "bf" ? props.item.image : undefined;
  const restaurantId: RestaurantId = props.restaurantId;

  return (
    <article className="flex gap-3 rounded-xl border border-white/10 bg-[#161616] p-3">
      {image ? (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
          <Image
            src={image}
            alt={name}
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#2a1515] to-[#1a1a1a] text-xl font-bold text-[#ED1C24]/80">
          {name.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-snug text-white">
              {name}
            </h3>
            {nameZh ? (
              <p className="mt-0.5 text-xs text-zinc-500">{nameZh}</p>
            ) : null}
          </div>
          <p className="shrink-0 text-sm font-bold text-[#ED1C24]">
            {formatHkd(props.item.price)}
          </p>
        </div>
        {description ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-zinc-400">
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
            <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/30 px-1 py-0.5">
              <button
                type="button"
                aria-label={`Decrease ${name}`}
                onClick={() => setQuantity(cartItem.id, qty - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-white hover:bg-white/10"
              >
                −
              </button>
              <span className="min-w-5 text-center text-sm font-semibold text-white">
                {qty}
              </span>
              <button
                type="button"
                aria-label={`Increase ${name}`}
                onClick={() => addItem(cartItem)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-white hover:bg-white/10"
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
