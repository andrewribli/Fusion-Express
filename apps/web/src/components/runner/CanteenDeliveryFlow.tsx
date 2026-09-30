"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import { FileDropzone } from "@/components/FileDropzone";
import { CollegeDiscountRunnerBadge } from "@/components/CollegeDiscountRunnerBadge";
import { formatDeliveryAddress } from "@/data/cuhk-locations";
import { canteenNameForRestaurant, restaurantIdFromOrderItems } from "@/data/canteen/colleges";
import { orderCampus } from "@/lib/orders";
import { runnerEarningsForOrder } from "@/lib/order-status";
import {
  customerCollegeSavingsView,
  runnerCollegeBonus,
} from "@fusion-express/shared/college-discount";
import { resolveSpecialInstructions } from "@/lib/constants";
import { OrderCounterparty } from "@/components/DeliveryIdentity";
import { RunnerOrderItemList } from "@/components/runner/RunnerOrderItemList";
import type { Order } from "@/lib/types";
import { isCityuCanteenOrder, parseHkdAmount } from "@fusion-express/shared";
import { formatScheduledLabel } from "@/lib/order-window";

function orderPickedUp(order: Order): boolean {
  return (
    order.status === "purchased" ||
    order.status === "receipt_uploaded" ||
    order.status === "delivered" ||
    Boolean(order.pickedUpAt)
  );
}

/** CityU step 2 opens only after the receipt photo and HKD total are stored. */
function cityuReceiptStepDone(order: Order): boolean {
  return (
    order.status === "receipt_uploaded" &&
    Boolean(order.receiptUrl) &&
    parseHkdAmount(order.receiptAmount) != null
  );
}

/**
 * Canteen runner flow. CUHK stays pick up, then lobby photo.
 * CityU step 1 requires a receipt photo and the HKD total before the lobby photo.
 */
export function CanteenDeliveryFlow({
  order,
  runnerCollege,
  photoFile,
  receiptFile,
  busy,
  uploading,
  error,
  onPhoto,
  onReceipt,
  onReceiptContinue,
  onPickedUp,
  onDelivered,
  onClose,
}: {
  order: Order;
  runnerCollege?: string | null;
  photoFile?: File;
  receiptFile?: File;
  busy: boolean;
  uploading: "" | "receipt" | "photo";
  error: string;
  onPhoto: (file: File) => void;
  onReceipt?: (file: File) => void;
  onReceiptContinue?: (amount: number) => Promise<boolean>;
  onPickedUp: () => Promise<boolean>;
  onDelivered: () => Promise<boolean>;
  onClose: () => void;
}) {
  const cityu = isCityuCanteenOrder(order);
  const pickedUp = orderPickedUp(order);
  const [step, setStep] = useState(() =>
    cityu ? (cityuReceiptStepDone(order) ? 1 : 0) : pickedUp ? 1 : 0,
  );
  const [amountText, setAmountText] = useState(() =>
    order.receiptAmount != null && order.receiptAmount > 0
      ? String(order.receiptAmount)
      : "",
  );
  const typedAmount = parseHkdAmount(amountText);
  const hasReceipt = Boolean(order.receiptUrl);
  const hasLobby = Boolean(order.deliveryPhotoUrl || photoFile);
  const blocked = busy || uploading !== "";
  const canContinue = pickedUp && hasReceipt && typedAmount != null;
  const restaurantId =
    order.canteenRestaurantId || restaurantIdFromOrderItems(order.items);
  const canteenName = canteenNameForRestaurant(restaurantId);

  useEffect(() => {
    setStep(
      cityu
        ? cityuReceiptStepDone(order)
          ? 1
          : 0
        : orderPickedUp(order)
          ? 1
          : 0,
    );
  }, [
    cityu,
    order.id,
    order.status,
    order.pickedUpAt,
    order.receiptUrl,
    order.receiptAmount,
  ]);

  useEffect(() => {
    setAmountText(
      order.receiptAmount != null && order.receiptAmount > 0
        ? String(order.receiptAmount)
        : "",
    );
  }, [order.id, order.receiptAmount]);

  async function handlePickUp() {
    const ok = await onPickedUp();
    if (ok && !cityu) setStep(1);
  }

  async function handleContinue() {
    if (typedAmount == null || !onReceiptContinue) return;
    const ok = await onReceiptContinue(typedAmount);
    if (ok) setStep(1);
  }

  async function finish() {
    const ok = await onDelivered();
    if (ok) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="canteen-flow-title"
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-[#1a1a1a] text-white shadow-2xl"
      >
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#f5f5f5]">
              Canteen · Step {step + 1} of 2
            </p>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full text-2xl text-[#f5f5f5] hover:bg-white/10"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <h2 id="canteen-flow-title" className="mt-3 text-lg font-bold text-white">
            {step === 0 ? "Pick up" : "Deliver"}
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {step === 0 && (
            <div className="space-y-3 text-sm">
              <DeadlineBanner order={order} party="runner" />
              <CollegeDiscountRunnerBadge
                order={order}
                runnerCollege={runnerCollege}
              />
              <div className="rounded-xl bg-[#2a2a2a] px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-[#c4c4c4]">
                  Pick up from
                </p>
                <p className="mt-1 font-semibold text-white">{canteenName}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-[#c4c4c4]">
                  Deliver to
                </p>
                <p className="mt-1 font-semibold text-white">
                  {formatDeliveryAddress(order.college, order.hall)}
                </p>
                <p className="text-xs text-[#c4c4c4]">Lobby: {order.lobbyPoint}</p>
                {order.scheduledFor ? (
                  <p className="mt-2 text-sm font-semibold text-amber-200">
                    Scheduled for {formatScheduledLabel(order.scheduledFor)}
                  </p>
                ) : null}
                <div className="mt-3">
                  <OrderCounterparty orderId={order.id} label="Customer:" tone="dark" />
                </div>
              </div>
              <RunnerOrderItemList items={order.items} dark />
              {(() => {
                const savings = customerCollegeSavingsView(order);
                if (!savings.show || savings.pending) return null;
                return (
                  <p className="rounded-xl bg-amber-950/60 px-3 py-2 text-amber-100">
                    College discount applied: −HK${savings.amount.toFixed(2)}
                  </p>
                );
              })()}
              <p className="rounded-xl bg-[#2a2418] px-3 py-2 text-[#f5e6c8]">
                {resolveSpecialInstructions(order.customerNote)}
              </p>
              <p className="text-[#c4c4c4]">
                Food{" "}
                <span className="font-bold text-white">${order.subtotal}</span>
                {" · "}You earn $
                {(
                  runnerEarningsForOrder(order.deliveryFee) +
                  runnerCollegeBonus(order)
                ).toFixed(2)}
              </p>
              <Link
                href={
                  orderCampus(order) === "cityu"
                    ? `/cityu/chat/${order.id}`
                    : `/chat/${order.id}`
                }
                className="flex min-h-11 items-center justify-center rounded-xl border border-white/20 text-sm font-semibold text-white"
              >
                Contact customer
              </Link>
              {cityu ? (
                <>
                  <FileDropzone
                    label="Receipt photo (required)"
                    hint="Photo of the canteen receipt"
                    file={receiptFile}
                    existingUrl={order.receiptUrl}
                    busy={uploading === "receipt"}
                    onFile={(file) => onReceipt?.(file)}
                  />
                  <label
                    className="block text-sm font-semibold text-white"
                    htmlFor="canteen-receipt-amount"
                  >
                    Receipt total (HK$)
                  </label>
                  <input
                    id="canteen-receipt-amount"
                    inputMode="decimal"
                    autoComplete="off"
                    value={amountText}
                    onChange={(event) => setAmountText(event.target.value)}
                    placeholder="0.00"
                    className="min-h-12 w-full rounded-xl border border-white/15 bg-[#2a2a2a] px-4 text-lg font-bold text-white"
                  />
                  <p className="text-xs text-[#c4c4c4]">
                    Type the exact total on the receipt. Both the photo and a
                    valid HKD amount are required before the lobby photo.
                  </p>
                </>
              ) : null}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="rounded-xl bg-green-950 px-3 py-2 text-sm text-green-200">
                Picked up from {canteenName}. Drop at the lobby and snap a photo.
              </p>
              <FileDropzone
                label="Lobby photo (required)"
                hint="Photo of the order at the lobby"
                file={photoFile}
                existingUrl={order.deliveryPhotoUrl}
                busy={uploading === "photo"}
                onFile={onPhoto}
              />
            </div>
          )}

          {error ? (
            <p className="mt-3 rounded-xl bg-red-950 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          {step === 0 ? (
            cityu && pickedUp ? (
              <button
                type="button"
                disabled={!canContinue || blocked}
                onClick={() => void handleContinue()}
                className="min-h-12 w-full rounded-xl bg-[#ED1C24] text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? "Saving…" : "Continue"}
              </button>
            ) : (
              <button
                type="button"
                disabled={blocked}
                onClick={() => void handlePickUp()}
                className="min-h-12 w-full rounded-xl bg-[#ED1C24] text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? "Saving…" : "Mark as Picked Up"}
              </button>
            )
          ) : (
            <button
              type="button"
              disabled={blocked || !hasLobby}
              onClick={() => void finish()}
              className="min-h-12 w-full rounded-xl bg-[#ED1C24] text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Mark delivered"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
