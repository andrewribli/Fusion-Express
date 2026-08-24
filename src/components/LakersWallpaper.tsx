"use client";

import type { ReactNode } from "react";

export function LakersWallpaper({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-lakers-navy">
        <div className="absolute inset-0 bg-gradient-to-br from-[#552583] via-[#1d1160] to-black" />
        <div className="absolute -right-24 top-16 h-80 w-80 rounded-full bg-lakers-gold/30 blur-3xl" />
        <div className="absolute -left-20 bottom-10 h-96 w-96 rounded-full bg-lakers-gold/20 blur-3xl" />
        <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-lakers-gold/50 to-transparent" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
