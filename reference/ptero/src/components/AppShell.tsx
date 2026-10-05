"use client";

import { BottomNav } from "@/components/BottomNav";
import { SiteFooter } from "@/components/SiteFooter";
import { TrackOrderFab } from "@/components/TrackOrderFab";

export function AppShell({
  children,
  hideNav,
}: {
  children: React.ReactNode;
  hideNav?: boolean;
}) {
  return (
    <>
      <div className={hideNav ? "" : "pb-20 md:pb-0"}>
        {children}
        <SiteFooter />
      </div>
      <TrackOrderFab />
      {!hideNav && <BottomNav />}
    </>
  );
}
