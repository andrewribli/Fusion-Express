"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import { FileDropzone } from "@/components/FileDropzone";
import { formatDeliveryAddress } from "@/data/cuhk-locations";
import { orderCampus } from "@/lib/orders";
import { runnerEarningsForOrder } from "@/lib/order-status";
import { resolveSpecialInstructions } from "@/lib/constants";
import { RunnerOrderItemList } from "@/components/runner/RunnerOrderItemList";
import type { Order } from "@/lib/types";
import { supermarketForCampus } from "@fusion-express/shared/campus";

const STEPS = [
  "Order details",
  "Purchase",
  "Delivery",
  "Final total",
  "Confirm",
] as const;

/** Resume wizard at the first incomplete step based on Firestore fields. */
export function runnerFlowStartStep(order: Order): number {
  const cityu = order.campus === "cityu";
  const hasReceipt = Boolean(order.receiptUrl);
  const hasBank = cityu || Boolean(order.bankStatementUrl);
  if (!hasReceipt || !hasBank) {
    return hasReceipt || hasBank ? 1 : 0;
  }
  if (!order.deliveryPhotoUrl || !order.runnerVerified) return 2;
  if (!(Number(order.finalTotal) > 0)) return 3;
  return 4;
}

export function RunnerDeliveryFlow({
  order,
  receiptFile,
  bankFile,
  photoFile,
  finalTotal,
  bagConfirmed,
  busy,
  uploading,
  error,
  onReceipt,
  onBank,
  onPhoto,
  onFinalTotal,
  onBagConfirmed,
  onDelivered,
  onClose,
}: {
  order: Order;
  receiptFile?: File;
  bankFile?: File;
  photoFile?: File;
  finalTotal: string;
  bagConfirmed: boolean;
  busy: boolean;
  uploading: "" | "receipt" | "bank" | "photo" | "total";
  error: string;
  onReceipt: (file: File) => void;
  onBank: (file: File) => void;
  onPhoto: (file: File) => void;
  onFinalTotal: (value: string) => void;
  onBagConfirmed: (value: boolean) => void;
  onDelivered: () => Promise<boolean>;
  onClose: () => void;
}) {
  const [step, setStep] = useState(() => runnerFlowStartStep(order));
  const store = supermarketForCampus(order.campus);
  const cityu = order.campus === "cityu";
  const hasReceipt = Boolean(order.receiptUrl || receiptFile);
  const hasBank = cityu || Boolean(order.bankStatementUrl || bankFile);
  const hasLobby = Boolean(order.deliveryPhotoUrl || photoFile);
  const totalOk = Number(finalTotal) > 0;
  const blocked = busy || uploading !== "";

  useEffect(() => {
    setStep(runnerFlowStartStep(order));
    // Only re-seed when opening a different order.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: order.id only
  }, [order.id]);

  function canLeave(index: number): boolean {
    if (index === 1) return hasReceipt && hasBank && uploading === "";
    if (index === 2) return bagConfirmed && hasLobby && uploading === "";
    if (index === 3) return totalOk && uploading === "";
    return true;
  }

  function next() {
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function finish() {
    const ok = await onDelivered();
    if (ok) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="runner-flow-title"
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-[#1a1a1a] text-white shadow-2xl"
      >
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#f5f5f5]">
              Step {step + 1} of {STEPS.length}
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
          <div className="mt-2 flex gap-1" aria-hidden>
            {STEPS.map((label, index) => (
              <span
                key={label}
                className="h-1.5 flex-1 rounded-full"
                style={{ backgroundColor: index <= step ? "#ED1C24" : "#3a3a3a" }}
              />
            ))}
          </div>
          <h2 id="runner-flow-title" className="mt-3 text-lg font-bold text-white">
            {STEPS[step]}
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {step === 0 && (
            <div className="space-y-3 text-sm">
              <DeadlineBanner order={order} party="runner" />
              <div className="rounded-xl bg-[#2a2a2a] px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-[#c4c4c4]">Deliver to</p>
                <p className="mt-1 font-semibold text-white">
                  {formatDeliveryAddress(order.college, order.hall)}
                </p>
                <p className="text-xs text-[#c4c4c4]">Lobby: {order.lobbyPoint}</p>
                {order.customerName && (
                  <p className="mt-1 text-xs text-[#c4c4c4]">
                    Customer: {order.customerName}
                  </p>
                )}
              </div>
              <RunnerOrderItemList items={order.items} dark />
              <p className="rounded-xl bg-[#2a2418] px-3 py-2 text-[#f5e6c8]">
                {resolveSpecialInstructions(order.customerNote)}
              </p>
              <p className="text-[#c4c4c4]">
                Estimated grocery <span className="font-bold text-white">${order.subtotal}</span>
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
              <p className="text-sm text-[#f5f5f5]">
                {cityu
                  ? `Pay at ${store} yourself, then photograph the receipt. You cannot mark this delivered until that photo is saved.`
                  : `Pay $${order.subtotal} at ${store} yourself, then attach the receipt and bank statement. Each photo saves as soon as you pick it.`}
              </p>
              {order.status === "purchased" && order.receiptUrl && (cityu || order.bankStatementUrl) ? (
                <p className="rounded-xl bg-green-950 px-3 py-2 text-sm text-green-200">
                  Purchase proof already saved. Continue to delivery.
                </p>
              ) : null}
              <FileDropzone
                label={`${store} receipt (required)`}
                hint="Tap to take or choose a photo"
                file={receiptFile}
                existingUrl={order.receiptUrl}
                busy={uploading === "receipt"}
                onFile={onReceipt}
              />
              {cityu ? null : (
              <FileDropzone
                label="Bank statement (required)"
                hint={`Screenshot of the ${store} payment`}
                file={bankFile}
                existingUrl={order.bankStatementUrl}
                busy={uploading === "bank"}
                onFile={onBank}
              />
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#f5f5f5]">
                Write {order.customerName || "the customer's full name"} on the receipt and
                attach it to the bag.
              </p>
              <label className="flex min-h-11 items-start gap-3 rounded-xl bg-[#2a2a2a] px-3 py-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={bagConfirmed}
                  onChange={(event) => onBagConfirmed(event.target.checked)}
                  className="mt-1 h-5 w-5 accent-[#ED1C24]"
                />
                I wrote the name on the receipt and attached it to the bag.
              </label>
              <FileDropzone
                label="Lobby photo (required)"
                hint="Photo of the bag at the lobby, receipt visible"
                file={photoFile}
                existingUrl={order.deliveryPhotoUrl}
                busy={uploading === "photo"}
                onFile={onPhoto}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-[#f5f5f5]">
                Enter the exact {store} receipt total. The customer pays this plus delivery.
              </p>
              <label className="block text-sm font-semibold text-white" htmlFor="final-total">
                Final {store} total (HK$)
              </label>
              <input
                id="final-total"
                type="number"
                min={0.1}
                step="0.1"
                inputMode="decimal"
                value={finalTotal}
                onChange={(event) => onFinalTotal(event.target.value)}
                placeholder={String(order.subtotal)}
                className="min-h-12 w-full rounded-xl border border-white/15 bg-[#2a2a2a] px-4 text-lg font-bold text-white"
              />
              {uploading === "total" ? (
                <p className="text-xs text-[#c4c4c4]">Saving total…</p>
              ) : order.finalTotal != null && Number(finalTotal) === order.finalTotal ? (
                <p className="text-xs text-green-300">Total saved</p>
              ) : null}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2 text-sm text-[#f5f5f5]">
              <p>Receipt: {hasReceipt ? "uploaded" : "missing"}</p>
              <p>Bank statement: {hasBank ? "uploaded" : "missing"}</p>
              <p>Name on bag: {bagConfirmed ? "confirmed" : "not confirmed"}</p>
              <p>Lobby photo: {hasLobby ? "ready" : "missing"}</p>
              <p className="text-lg font-bold text-white">
                Final total: {totalOk ? `$${finalTotal}` : "missing"}
              </p>
              <p className="text-xs text-[#c4c4c4]">
                Marking delivered starts the customer&apos;s 24-hour payment timer.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-xl bg-red-950 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-white/10 p-4">
          <button
            type="button"
            disabled={step === 0 || blocked}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            className="min-h-12 flex-1 rounded-xl border border-white/20 text-sm font-bold text-white disabled:opacity-40"
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={(step > 0 && !canLeave(step)) || blocked}
              onClick={() => next()}
              className="min-h-12 flex-[2] rounded-xl bg-[#ED1C24] text-sm font-bold text-white disabled:opacity-40"
            >
              {uploading ? "Saving…" : "Next"}
            </button>
          ) : (
            <button
              type="button"
              disabled={
                blocked ||
                !hasReceipt ||
                !hasBank ||
                !bagConfirmed ||
                !hasLobby ||
                !totalOk
              }
              onClick={() => void finish()}
              className="min-h-12 flex-[2] rounded-xl bg-[#ED1C24] text-sm font-bold text-white disabled:opacity-40"
            >
              {busy ? "Saving…" : "Mark as Delivered"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
