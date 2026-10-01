"use client";

import { useMemo, useState } from "react";
import type { PayoutDetails, PayoutMethod } from "@fusion-express/shared/payout";
import {
  hasCompletePayout,
  payoutMethodLabel,
} from "@fusion-express/shared/payout";

const METHODS: { id: PayoutMethod; label: string }[] = [
  { id: "fps", label: "FPS" },
  { id: "payme", label: "PayMe" },
  { id: "bank", label: "Bank transfer" },
];

const inputClass =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-mono text-sm text-gray-900 placeholder:font-sans placeholder:text-gray-400 focus:border-[#ED1C24] focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/20";

export function RunnerPayoutSettings({
  initialMethod,
  initialDetails,
  onSave,
  submitLabel = "Save payout details",
  compact = false,
}: {
  initialMethod?: PayoutMethod | null;
  initialDetails?: PayoutDetails | null;
  onSave: (
    method: PayoutMethod,
    details: PayoutDetails,
  ) => Promise<void> | void;
  submitLabel?: string;
  compact?: boolean;
}) {
  const [method, setMethod] = useState<PayoutMethod | null>(
    initialMethod ?? null,
  );
  const [fpsId, setFpsId] = useState(initialDetails?.fpsId ?? "");
  const [paymePhone, setPaymePhone] = useState(
    initialDetails?.paymePhone ?? "",
  );
  const [bankName, setBankName] = useState(initialDetails?.bankName ?? "");
  const [bankAccount, setBankAccount] = useState(
    initialDetails?.bankAccount ?? "",
  );
  const [holder, setHolder] = useState(
    initialDetails?.accountHolderName ?? "",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const details: PayoutDetails = useMemo(
    () => ({
      fpsId: fpsId.trim() || undefined,
      paymePhone: paymePhone.trim() || undefined,
      bankName: bankName.trim() || undefined,
      bankAccount: bankAccount.trim() || undefined,
      accountHolderName: holder.trim() || undefined,
    }),
    [fpsId, paymePhone, bankName, bankAccount, holder],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    if (!method) {
      setError("Choose how you want to be paid");
      return;
    }
    if (!hasCompletePayout(method, details)) {
      setError("Fill in all required fields for your payment method");
      return;
    }
    setSaving(true);
    try {
      await onSave(method, details);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      {!compact && (
        <div>
          <h3 className="text-base font-bold text-gray-900">
            How would you like to be paid?
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            GraceRun reimburses you after delivery. Pick FPS, PayMe, or bank
            transfer.
          </p>
        </div>
      )}

      <fieldset className="space-y-2">
        <legend className="sr-only">Payment method</legend>
        {METHODS.map((m) => (
          <label
            key={m.id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${
              method === m.id
                ? "border-[#ED1C24] bg-red-50 font-semibold text-gray-900"
                : "border-gray-200 bg-white text-gray-700"
            }`}
          >
            <input
              type="radio"
              name="payoutMethod"
              value={m.id}
              checked={method === m.id}
              onChange={() => setMethod(m.id)}
              className="h-4 w-4 accent-[#ED1C24]"
            />
            {m.label}
          </label>
        ))}
      </fieldset>

      {method === "fps" && (
        <div>
          <label htmlFor="fps-id" className="text-xs font-semibold text-gray-600">
            FPS ID (phone or email)
          </label>
          <input
            id="fps-id"
            value={fpsId}
            onChange={(e) => setFpsId(e.target.value)}
            className={inputClass}
            placeholder="91234567 or name@email.com"
            autoComplete="tel"
          />
        </div>
      )}

      {method === "payme" && (
        <div>
          <label
            htmlFor="payme-phone"
            className="text-xs font-semibold text-gray-600"
          >
            PayMe phone number
          </label>
          <input
            id="payme-phone"
            value={paymePhone}
            onChange={(e) => setPaymePhone(e.target.value)}
            className={inputClass}
            placeholder="91234567"
            inputMode="tel"
            autoComplete="tel"
          />
        </div>
      )}

      {method === "bank" && (
        <div className="space-y-3">
          <div>
            <label
              htmlFor="bank-name"
              className="text-xs font-semibold text-gray-600"
            >
              Bank name
            </label>
            <input
              id="bank-name"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className={inputClass}
              placeholder="HSBC"
            />
          </div>
          <div>
            <label
              htmlFor="bank-account"
              className="text-xs font-semibold text-gray-600"
            >
              Account number
            </label>
            <input
              id="bank-account"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className={inputClass}
              placeholder="123-456789-001"
              inputMode="numeric"
            />
          </div>
        </div>
      )}

      {method && (
        <div>
          <label
            htmlFor="account-holder"
            className="text-xs font-semibold text-gray-600"
          >
            Account holder name
            {method === "bank" ? "" : " (optional)"}
          </label>
          <input
            id="account-holder"
            value={holder}
            onChange={(e) => setHolder(e.target.value)}
            className={inputClass}
            placeholder="Your name on the account"
            autoComplete="name"
          />
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Saved — payouts will go via {payoutMethodLabel(method)}.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-[#ED1C24] py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
