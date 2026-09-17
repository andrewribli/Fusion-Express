"use client";

import type { ReactNode } from "react";

/** Homepage canvas — light gray, same on every page. */
export function LakersWallpaper({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#f3f4f6]">
      <div className="relative z-10">{children}</div>
    </div>
  );
}
