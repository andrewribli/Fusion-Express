"use client";

import { isStagingApp } from "@/lib/constants";

export function StagingBanner() {
  if (!isStagingApp()) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[60] bg-amber-400 px-3 py-2 text-center text-xs font-bold tracking-wide text-amber-950"
    >
      STAGING — not for real orders
    </div>
  );
}
