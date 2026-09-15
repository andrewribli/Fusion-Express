"use client";

import { ModeSwitchButton } from "@/components/ModeSwitchButton";

/** Standing reminder that runner mode is a different app than shopping. */
export function RunnerModeBanner() {
  return (
    <div className="border-b border-lakers-gold/30 bg-lakers-navy">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
        <p className="flex items-center gap-2 text-xs font-semibold text-lakers-gold">
          <span
            aria-hidden
            className="inline-flex h-2 w-2 rounded-full bg-lakers-gold"
          />
          You&apos;re in Runner Mode
        </p>
        <ModeSwitchButton
          label="Switch to Customer"
          className="rounded-full bg-lakers-gold px-3 py-1 text-[11px] font-bold text-lakers-navy"
        />
      </div>
    </div>
  );
}
