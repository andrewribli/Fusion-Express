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
      {/* Order token is intentionally not prominent — shown truncated at page bottom */}
    </div>
  );
}

export function truncateOrderId(id: string): string {
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}
