"use client";

import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { formatHkd } from "@/data/canteen/bf-menu";
import type { MenuItem as BfItem } from "@/data/canteen/bf-menu";
import type { SimpleMenuItem } from "@/data/canteen/simple-menu";
import type { UcMenuItem } from "@/data/canteen/uc-menu";
import type { RestaurantId } from "@/data/canteen/restaurants";
import type { SimpleRestaurantId } from "@/data/canteen/simple-menu";
import {
  toCartMenuItemFromBf,
  toCartMenuItemFromSimple,
  toCartMenuItemFromUc,
} from "@/lib/canteen/cart";

type Props = (
  | { kind: "bf"; item: BfItem; restaurantId: "benjamin-franklin" }
  | { kind: "uc"; item: UcMenuItem; restaurantId: "uc-canteen" }
  | {
      kind: "simple";
      item: SimpleMenuItem;
      restaurantId: SimpleRestaurantId;
    }
) & {
  /** When canteen is closed, block add-to-cart. */
  orderingEnabled?: boolean;
};

export function CanteenMenuCard(props: Props) {
  const orderingEnabled = props.orderingEnabled !== false;
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
  const image = props.item.image;
  const signature = props.kind === "simple" ? props.item.signature : false;
  const includesDrink =
    props.kind === "simple"
      ? Boolean(props.item.includesDrink)
      : props.kind === "uc"
        ? /hot drink|includes.*drink|complimentary hot drink/i.test(
            props.item.description ?? "",
          )
        : false;
  const drinkAddon =
    props.kind === "simple" ? props.item.drinkAddonPrice : undefined;
  const restaurantId: RestaurantId = props.restaurantId;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="relative aspect-square w-full shrink-0 bg-gray-50">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            sizes="(max-width:768px) 50vw, 200px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-red-50 to-gray-50 text-3xl font-bold text-[#ED1C24]/70">
            {name.slice(0, 1)}
          </div>
        )}
        {signature ? (
          <span className="absolute left-2 top-2 rounded-md bg-[#ED1C24] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Signature
          </span>
        ) : null}
        {includesDrink ? (
          <span className="absolute bottom-2 left-2 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            Includes Drink
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
          {name}
        </h3>
        {nameZh ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{nameZh}</p>
        ) : null}
        {description ? (
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-gray-500">
            {description}
          </p>
        ) : null}
        {typeof drinkAddon === "number" ? (
          <p className="mt-1 text-[11px] font-medium text-gray-600">
            Add a drink +{formatHkd(drinkAddon)}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <p className="text-sm font-bold text-[#ED1C24]">
            {formatHkd(props.item.price)}
          </p>
          {!orderingEnabled ? (
            <button
              type="button"
              disabled
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-lg font-bold leading-none text-gray-400"
              aria-label="Ordering closed"
            >
              +
            </button>
          ) : qty === 0 ? (
            <button
              type="button"
              onClick={() => addItem(cartItem)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ED1C24] text-lg font-bold leading-none text-white hover:bg-[#c9161d]"
              aria-label={`Add ${name}`}
            >
              +
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-1 py-0.5">
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
