"use client";

import type { ReactNode } from "react";

/** Solid dark canvas — no heavy gradient blobs. */
export function LakersWallpaper({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "linear-gradient(180deg, #12121a 0%, #0c0c10 55%, #0a0a0c 100%)",
        }}
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
