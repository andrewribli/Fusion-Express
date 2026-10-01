"use client";

import { CopyValueButton } from "@/components/CopyValueButton";
import type { Order } from "@/lib/types";
import type { PayoutDetails, PayoutMethod } from "@fusion-express/shared/payout";
import {
  buildPayoutDetailsFromLegacy,
  fromRunnerPaymentLabel,
  payoutLooksMalformed,
  payoutMethodLabel,
} from "@fusion-express/shared/payout";

function Row({
  label,
  value,
  warn,
}: {
  label: string;
  value?: string;
  warn?: boolean;
}) {
  if (!value?.trim()) return null;
  return (
    <div className="mt-1.5 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-gray-500">{label}</p>
        <p className="break-all font-mono text-sm text-gray-900">
          {value}
          {warn && (
            <span
              className="ml-1 inline-block text-amber-600"
              title="This value looks unusually short — double-check with the runner"
              aria-label="Warning: details may be malformed"
            >
              ⚠️
            </span>
          )}
        </p>
      </div>
      <CopyValueButton value={value} />
    </div>
  );
}

function resolvePayout(order: Order): {
  method: PayoutMethod | null;
  details: PayoutDetails;
} {
  if (order.runnerPayoutMethod && order.runnerPayoutDetails) {
    return {
      method: order.runnerPayoutMethod,
      details: order.runnerPayoutDetails,
    };
  }
  const legacy = buildPayoutDetailsFromLegacy(
    order.runnerPaymentMethod,
    order.runnerPaymentId,
    order.runnerName,
  );
  if (legacy) {
    return { method: legacy.payoutMethod, details: legacy.payoutDetails };
  }
  return {
    method: fromRunnerPaymentLabel(order.runnerPaymentMethod),
    details: {},
  };
}

/** Inline runner FPS / PayMe / bank details for admin Verify & pay cards. */
export function AdminRunnerPayoutDetails({ order }: { order: Order }) {
  const { method, details } = resolvePayout(order);
  const malformed = payoutLooksMalformed(method, details);
  const hasAny =
    Boolean(details.fpsId) ||
    Boolean(details.paymePhone) ||
    Boolean(details.bankAccount) ||
    Boolean(order.runnerPaymentId);

  if (!method || !hasAny) {
    return (
      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
        ⚠️ No payment method on file. Ask the runner to add one in Profile.
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {payoutMethodLabel(method)}
        </span>
        <span className="text-xs text-gray-500">Payment method</span>
      </div>
      {method === "fps" && (
        <Row label="FPS ID" value={details.fpsId} warn={malformed} />
      )}
      {method === "payme" && (
        <Row
          label="PayMe phone"
          value={details.paymePhone}
          warn={malformed}
        />
      )}
      {method === "bank" && (
        <>
          <Row label="Bank" value={details.bankName} />
          <Row
            label="Account"
            value={details.bankAccount}
            warn={malformed}
          />
        </>
      )}
      <Row
        label="Account holder"
        value={details.accountHolderName ?? order.runnerName}
      />
    </div>
  );
}
