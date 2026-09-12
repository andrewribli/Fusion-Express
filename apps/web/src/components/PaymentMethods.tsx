"use client";

import { useState } from "react";
import { getGraceRunPaymentAccounts } from "@/lib/payments";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable (insecure context) — ignore silently.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

/**
 * Shows the GraceRun PayMe / FPS accounts. Set `showCopy` to allow copying the
 * ids (used inside the Pay Now modal); leave it off for informational display.
 */
export function PaymentMethods({
  showCopy = false,
  className = "",
}: {
  showCopy?: boolean;
  className?: string;
}) {
  const accounts = getGraceRunPaymentAccounts();

  return (
    <ul className={`space-y-2 ${className}`}>
      {accounts.map((account) => (
        <li
          key={account.method}
          className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
        >
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {account.method}
            </p>
            <p className="text-sm text-gray-700">{account.id}</p>
            <p className="text-[11px] text-gray-400">{account.hint}</p>
          </div>
          <div className="flex items-center gap-2">
            {account.link && (
              <a
                href={account.link}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-fusion-red px-2.5 py-1 text-xs font-semibold text-white"
              >
                Open
              </a>
            )}
            {showCopy && <CopyButton value={account.id} />}
          </div>
        </li>
      ))}
    </ul>
  );
}
