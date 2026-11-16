import type { Order, OrderChannel } from "@/lib/types";

export function resolveOrderChannel(order: Order): OrderChannel {
  if (
    order.orderChannel === "canteen" ||
    order.orderChannel === "fusion" ||
    order.orderChannel === "taste"
  ) {
    return order.orderChannel;
  }
  if (order.items.some((item) => item.itemId.startsWith("canteen:"))) {
    return "canteen";
  }
  if (order.campus === "cityu") return "taste";
  return "fusion";
}

export function OrderChannelBadge({ order }: { order: Order }) {
  const channel = resolveOrderChannel(order);
  if (channel === "canteen") {
    return (
      <span className="inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
        Canteen
      </span>
    );
  }
  if (channel === "taste") {
    return (
      <span className="inline-flex rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#ED1C24]">
        Taste
      </span>
    );
  }
  return null;
}
