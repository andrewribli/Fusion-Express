"use client";

/** Standing reminder that runner mode is a different app than shopping. */
export function RunnerModeBanner() {
  return (
    <div className="border-b border-red-100 bg-red-50">
      <div className="mx-auto max-w-7xl px-4 py-2">
        <p className="flex items-center gap-2 text-xs font-semibold text-[#ED1C24]">
          <span
            aria-hidden
            className="inline-flex h-2 w-2 rounded-full bg-[#ED1C24]"
          />
          You&apos;re in Runner Mode
        </p>
      </div>
    </div>
  );
}
