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
import { resolveSpecialInstructions } from "@/lib/constants";
import { RunnerOrderItemList } from "@/components/runner/RunnerOrderItemList";
import type { Order } from "@/lib/types";

/**
 * Simplified runner flow for canteen orders: pick up → lobby photo → deliver.
 * No Fusion receipt / bank statement.
 */
export function CanteenDeliveryFlow({
  order,
  runnerCollege,
  photoFile,
  busy,
  uploading,
  error,
  onPhoto,
  onPickedUp,
  onDelivered,
  onClose,
}: {
  order: Order;
  runnerCollege?: string | null;
  photoFile?: File;
  busy: boolean;
  uploading: "" | "photo";
  error: string;
  onPhoto: (file: File) => void;
  onPickedUp: () => Promise<boolean>;
  onDelivered: () => Promise<boolean>;
  onClose: () => void;
}) {
  const pickedUp =
    order.status === "purchased" ||
    order.status === "delivered" ||
    Boolean(order.pickedUpAt);
  const [step, setStep] = useState(pickedUp ? 1 : 0);
  const hasLobby = Boolean(order.deliveryPhotoUrl || photoFile);
  const blocked = busy || uploading !== "";
  const restaurantId =
    order.canteenRestaurantId || restaurantIdFromOrderItems(order.items);
  const canteenName = canteenNameForRestaurant(restaurantId);

  useEffect(() => {
    setStep(
      order.status === "purchased" ||
        order.status === "delivered" ||
        Boolean(order.pickedUpAt)
        ? 1
        : 0,
    );
  }, [order.id, order.status, order.pickedUpAt]);

  async function handlePickUp() {
    const ok = await onPickedUp();
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
              </div>
              <RunnerOrderItemList items={order.items} dark />
              {order.discountApplied && (order.discountAmount ?? 0) > 0 && (
                <p className="rounded-xl bg-amber-950/60 px-3 py-2 text-amber-100">
                  College discount applied: −HK${(order.discountAmount ?? 0).toFixed(2)}
                </p>
              )}
              <p className="rounded-xl bg-[#2a2418] px-3 py-2 text-[#f5e6c8]">
                {resolveSpecialInstructions(order.customerNote)}
              </p>
              <p className="text-[#c4c4c4]">
                Food{" "}
                <span className="font-bold text-white">${order.subtotal}</span>
                {" · "}You earn ${runnerEarningsForOrder(order.deliveryFee)}
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
            <button
              type="button"
              disabled={blocked}
              onClick={() => void handlePickUp()}
              className="min-h-12 w-full rounded-xl bg-[#ED1C24] text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Mark as Picked Up"}
            </button>
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
