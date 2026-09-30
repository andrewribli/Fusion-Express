"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { OrderLimitNotice } from "@/ptero/components/OrderLimitNotice";
import { useCart } from "@/ptero/context/CartContext";
import { isCanteenCart, primaryCanteenRestaurantId } from "@/ptero/lib/canteen/cart";
import { isOverOrderLimit } from "@/ptero/lib/constants";
import { isGrocerySourceId } from "@/lib/grocerySources";
import { computeDeliveryFee } from "@fusion-express/shared/delivery-pricing";
import { readCityuHall } from "@/lib/cityu-hall";

/** Mobile sticky checkout bar — delivery total comes from the pricing engine. */
export function OrderActionBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { itemCount, subtotal, items } = useCart();
  const [hall, setHall] = useState("");
  useEffect(() => {
    setHall(readCityuHall());
  }, []);
  const canteen = isCanteenCart(items);
  const groceryIds = [
    ...new Set(items.map((line) => line.item.grocerySource).filter(isGrocerySourceId)),
  ];
  const sourceId = canteen
    ? primaryCanteenRestaurantId(items.map((line) => ({ id: line.item.id }))) || "ac1"
    : groceryIds[0] || "taste";
  const quote = computeDeliveryFee({ campus: "cityu", sourceId, hallId: hall });
  const overLimit = isOverOrderLimit(subtotal);

  if (itemCount === 0) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-x-4 z-40 md:bottom-4 xl:hidden ${
        pathname.startsWith("/cityu/canteen")
          ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"
          : "bottom-[calc(7.75rem+env(safe-area-inset-bottom,0px))]"
      }`}
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg flex-col gap-1.5">
        <OrderLimitNotice subtotal={subtotal} />
        <button
          type="button"
          disabled={overLimit}
          onClick={() => router.push("/cityu/checkout")}
          className="flex min-h-11 w-full items-center justify-center rounded-full bg-[#ED1C24] px-4 text-sm font-bold text-white shadow-lg disabled:opacity-50"
        >
          {`Continue to checkout · $${(subtotal + quote.total).toFixed(0)}`}
        </button>
      </div>
    </div>
  );
}
