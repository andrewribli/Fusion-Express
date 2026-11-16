"use client";

import { useState } from "react";
import { shareGraceRun } from "@/lib/share";

export function ShareGraceRunButton() {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          const result = await shareGraceRun();
          if (result === "copied") {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }
        } catch {
          /* user cancelled the share sheet */
        }
      }}
      className="mt-4 w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-800 shadow-sm"
    >
      {copied ? "Link copied" : "Share GraceRun"}
    </button>
  );
}
