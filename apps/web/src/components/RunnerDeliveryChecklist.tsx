"use client";

export const RUNNER_DELIVERY_REQUIREMENTS = [
  "Write the customer's FULL NAME on the Fusion receipt and attach it to the bag.",
  "Upload the Fusion receipt photo and a bank/FPS screenshot of the till payment.",
  "Take the lobby photo with the named receipt visible in the shot.",
] as const;

export function RunnerDeliveryChecklist({
  confirmed,
  onConfirmedChange,
  inputId,
  customerName,
}: {
  confirmed: boolean;
  onConfirmedChange: (value: boolean) => void;
  inputId: string;
  customerName?: string;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
      <p className="text-xs font-bold text-amber-900">
        Write the customer&apos;s full name on the receipt and attach it to the bag.
      </p>
      {customerName ? (
        <p className="mt-1 text-sm font-semibold text-gray-900">
          Customer name: {customerName}
        </p>
      ) : null}
      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-amber-900">
        {RUNNER_DELIVERY_REQUIREMENTS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <label
        htmlFor={inputId}
        className="mt-3 flex items-start gap-2 text-xs font-semibold text-amber-900"
      >
        <input
          id={inputId}
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#ED1C24]"
        />
        I wrote the customer&apos;s full name on the receipt and attached it to the bag.
      </label>
    </div>
  );
}
