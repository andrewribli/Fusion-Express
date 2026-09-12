import { formatDeliveryAddress } from "@/data/cuhk-locations";
import { calculateDeliveryFee } from "@/lib/delivery";
import { DeliveryFeeBreakdown } from "@/components/DeliveryFeeBreakdown";
import { resolveSpecialInstructions } from "@/lib/constants";
import { runnerEarningsForOrder, RUNNER_EARNINGS_RATE } from "@/lib/order-status";
import type { Order } from "@/lib/types";

function formatKg(kg: number): string {
  return `${Math.round(kg * 100) / 100} kg`;
}

export function RunnerOrderDetails({
  order,
  showEarnings = true,
}: {
  order: Order;
  showEarnings?: boolean;
}) {
  const lineWeight = (item: Order["items"][number]) =>
    item.weightKg != null ? item.weightKg * item.quantity : undefined;
  const computedWeight =
    order.totalWeight ??
    order.items.reduce((sum, item) => sum + (lineWeight(item) ?? 0), 0);
  const breakdown = calculateDeliveryFee({
    weightKg: computedWeight,
    college: order.college,
  });
  const earn = runnerEarningsForOrder(order.deliveryFee);

  return (
    <div className="space-y-4 text-sm">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Items
        </h3>
        <ul className="mt-2 divide-y divide-gray-100">
          {order.items.map((item) => {
            const kg = lineWeight(item);
            return (
              <li
                key={`${item.itemId}-${item.name}`}
                className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {item.quantity}× {item.name}
                  </p>
                  {kg != null && (
                    <p className="text-xs text-gray-500">
                      {item.weightKg != null && item.quantity > 1
                        ? `${formatKg(item.weightKg)} each · ${formatKg(kg)} total`
                        : formatKg(kg)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {computedWeight > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            Order weight: {formatKg(computedWeight)}
          </p>
        )}
      </section>

      <section className="rounded-xl bg-gray-50 px-3 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Delivery
        </h3>
        <p className="mt-1 font-medium text-gray-900">
          {formatDeliveryAddress(order.college, order.hall)}
        </p>
        {order.roomNumber && (
          <p className="text-xs text-gray-600">Room: {order.roomNumber}</p>
        )}
        <p className="text-xs text-gray-600">Lobby: {order.lobbyPoint}</p>
        {order.customerName && (
          <p className="mt-1 text-xs text-gray-600">
            Customer: {order.customerName}
          </p>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Special instructions
        </h3>
        <p className="mt-1 whitespace-pre-wrap rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-gray-800">
          {resolveSpecialInstructions(order.customerNote)}
        </p>
        {order.runnerNote && (
          <p className="mt-2 text-xs text-gray-600">
            Your note: {order.runnerNote}
          </p>
        )}
      </section>

      <section className="rounded-xl bg-amber-50 px-3 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Estimated grocery cost
        </h3>
        <p className="mt-1 text-lg font-bold text-gray-900">${order.subtotal}</p>
        <p className="text-xs text-amber-900">
          Pay this at Fusion from your own pocket. GraceRun reimburses you after
          delivery.
        </p>
        {order.finalTotal != null && (
          <p className="mt-2 text-sm font-semibold text-gray-900">
            Receipt total entered: ${order.finalTotal}
          </p>
        )}
        <div className="mt-3 rounded-xl border-2 border-[#ED1C24] bg-[#FFF3CD] px-3.5 py-3">
          <p className="text-[15px] font-bold leading-snug text-[#7A1F1F]">
            Upon delivery to the customer&apos;s dorm:{" "}
            <span className="font-semibold">
              Ensure you attach the original Fusion receipt with the{" "}
              <span className="underline">customer&apos;s full name written on it</span>,
              along with a copy of your <span className="underline">bank statement</span>{" "}
              (for reimbursement). Do not leave the order without these documents.
            </span>
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Delivery fee
        </h3>
        <div className="mt-2">
          <DeliveryFeeBreakdown breakdown={breakdown} />
        </div>
        {breakdown.deliveryFee !== order.deliveryFee && (
          <p className="mt-1 text-xs text-gray-500">
            Charged delivery fee: ${order.deliveryFee}
          </p>
        )}
        {showEarnings && (
          <div className="mt-3 rounded-xl bg-[#ED1C24]/10 px-3 py-2">
            <p className="text-xs text-gray-600">
              Your cut ({RUNNER_EARNINGS_RATE * 100}% of delivery fee)
            </p>
            <p className="text-lg font-bold text-[#ED1C24]">${earn}</p>
            {(order.tip ?? 0) > 0 && (
              <p className="text-xs text-gray-600">
                Customer also added a ${order.tip} tip with the order.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
