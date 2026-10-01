"use client";

import { useState } from "react";

/** One-tap copy for admin payout account numbers. */
export function CopyValueButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const trimmed = value.trim();
  if (!trimmed) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard may be blocked
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="shrink-0 rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
      aria-label={`${label} ${trimmed}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
