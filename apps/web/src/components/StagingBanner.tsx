"use client";

import { useDemoAuth } from "@/lib/use-demo-auth";

export function StagingBanner() {
  const demo = useDemoAuth();
  if (!demo) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[60] bg-amber-400 px-3 py-2 text-center text-xs font-bold tracking-wide text-amber-950"
    >
      STAGING — OTP email works; demo accounts stay in this tab only
    </div>
  );
}
