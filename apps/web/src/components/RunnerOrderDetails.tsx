import { formatDeliveryAddress } from "@/data/cuhk-locations";
import { resolveSpecialInstructions } from "@/lib/constants";
import { runnerEarningsForOrder } from "@/lib/order-status";
import {
  COLLEGE_DISCOUNT_SPLIT,
  orderMatchesRunnerCollege,
  runnerCollegeBonus,
} from "@fusion-express/shared/college-discount";
import { formatStoredDeliveryFee } from "@fusion-express/shared/delivery-pricing";
import { RunnerOrderItemList } from "@/components/runner/RunnerOrderItemList";
import { CollegeDiscountRunnerBadge } from "@/components/CollegeDiscountRunnerBadge";
import { resolveOrderChannel } from "@/components/OrderChannelBadge";
import { OrderCounterparty } from "@/components/DeliveryIdentity";
import type { Order } from "@/lib/types";
import { supermarketForCampus } from "@fusion-express/shared/campus";
import { ScheduledDeliveryNote } from "@/components/ScheduledDeliveryNote";

function formatKg(kg: number): string {
  return `${Math.round(kg * 100) / 100} kg`;
}

export function RunnerOrderDetails({
  order,
  showEarnings = true,
  runnerCollege,
}: {
  order: Order;
  showEarnings?: boolean;
  runnerCollege?: string | null;
}) {
  const isCanteen = resolveOrderChannel(order) === "canteen";
  const lineWeight = (item: Order["items"][number]) =>
    item.weightKg != null ? item.weightKg * item.quantity : undefined;
  const computedWeight =
    order.totalWeight ??
    order.items.reduce((sum, item) => sum + (lineWeight(item) ?? 0), 0);
  const store = supermarketForCampus(order.campus);
  const baseEarn = runnerEarningsForOrder(order.deliveryFee);
  const previewMatch =
    !order.discountApplied &&
    orderMatchesRunnerCollege(order, runnerCollege);
  const collegeBonus = previewMatch
    ? (order.discountSplit?.runner ?? COLLEGE_DISCOUNT_SPLIT.runner)
    : runnerCollegeBonus(order);
  const earn = baseEarn + collegeBonus;
  const lockedDelivery = formatStoredDeliveryFee(order);

  return (
    <div className="space-y-4 text-sm">
      <CollegeDiscountRunnerBadge
        order={order}
        runnerCollege={order.runnerCollege || runnerCollege}
      />
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Items
        </h3>
        <div className="mt-2">
          <RunnerOrderItemList items={order.items} />
        </div>
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
        <div className="mt-2">
          <ScheduledDeliveryNote at={order.scheduledFor} />
        </div>
        <div className="mt-3">
          <OrderCounterparty orderId={order.id} label="Customer:" />
        </div>
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
          {isCanteen ? "Canteen food total" : "Estimated grocery cost"}
        </h3>
        <p className="mt-1 text-lg font-bold text-gray-900">${order.subtotal}</p>
        <p className="text-xs text-amber-900">
          {isCanteen ? (
            "Pay this at the canteen counter, then deliver to the lobby."
          ) : (
            <>
              Pay this at {store} <span className="font-bold">yourself first</span>.
              GraceRun reimburses you after delivery. Write the customer&apos;s
              full name on the receipt.
            </>
          )}
        </p>
        {order.finalTotal != null && (
          <p className="mt-2 text-sm font-semibold text-gray-900">
            Receipt total entered: ${order.finalTotal}
          </p>
        )}
        {!isCanteen && (
          <div className="mt-3 rounded-xl border-2 border-[#ED1C24] bg-[#FFF3CD] px-3.5 py-3">
            <p className="text-[15px] font-bold leading-snug text-[#7A1F1F]">
              Upon delivery to the customer&apos;s dorm:{" "}
              <span className="font-semibold">
                Ensure you attach the original {store} receipt with the{" "}
                <span className="underline">
                  customer&apos;s full name written on it
                </span>
                , along with a copy of your{" "}
                <span className="underline">bank statement</span> (for
                reimbursement). Do not leave the order without these documents.
              </span>
            </p>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Delivery fee
        </h3>
        <div className="mt-2 text-sm text-gray-800">{lockedDelivery}</div>
        <p className="mt-1 text-xs text-gray-500">
          Customer pays this delivery fee. It was saved with the order.
        </p>
        {showEarnings && (
          <div className="mt-3 rounded-xl bg-[#ED1C24]/10 px-3 py-2">
            <p className="text-xs text-gray-600">You will receive</p>
            {collegeBonus > 0 ? (
              <div className="mt-1 space-y-0.5 text-sm text-gray-800">
                <p>Base runner fee: HK${baseEarn.toFixed(2)}</p>
                <p>College discount bonus: HK${collegeBonus.toFixed(2)}</p>
                <p className="text-lg font-bold text-[#ED1C24]">
                  Total earnings: HK${earn.toFixed(2)}
                </p>
              </div>
            ) : (
              <p className="text-lg font-bold text-[#ED1C24]">${earn}</p>
            )}
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
