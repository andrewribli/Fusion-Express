import { formatOrderPlacedAt } from "@/lib/order-status";
import type { Order } from "@/lib/types";

export function CustomerOrderHeading({
  order,
  titleClassName = "text-lg font-bold text-gray-900",
}: {
  order: Order;
  titleClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className={titleClassName}>{formatOrderPlacedAt(order.createdAt)}</p>
      <p className="mt-0.5 break-all text-xs text-gray-400">{order.id}</p>
    </div>
  );
}
