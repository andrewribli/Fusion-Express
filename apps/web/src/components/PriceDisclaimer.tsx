import { PRICES_DISCLAIMER } from "@/lib/constants";

export function PriceDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ${className}`}>
      ℹ️ {PRICES_DISCLAIMER}
    </p>
  );
}
