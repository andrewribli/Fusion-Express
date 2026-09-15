"use client";

import type { CustomerPaymentMethod } from "@/lib/payment-method";

export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: CustomerPaymentMethod;
  onChange: (method: CustomerPaymentMethod) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-900">Pay after delivery</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["PayMe", "FPS"] as const).map((method) => {
          const selected = value === method;
          return (
            <button
              key={method}
              type="button"
              onClick={() => onChange(method)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold ${
                selected
                  ? "border-[#ED1C24] bg-red-50 text-[#ED1C24]"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              {method}
            </button>
          );
        })}
      </div>
    </div>
  );
}
