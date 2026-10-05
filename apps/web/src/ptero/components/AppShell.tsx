"use client";

import { BottomNav } from "@/ptero/components/BottomNav";
import { SiteFooter } from "@/ptero/components/SiteFooter";
import { TrackOrderFab } from "@/ptero/components/TrackOrderFab";

export function AppShell({
  children,
  hideNav,
  hideTrackFab,
}: {
  children: React.ReactNode;
  hideNav?: boolean;
  hideTrackFab?: boolean;
}) {
  return (
    <>
      <div className={hideNav ? "" : "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0"}>
        {children}
        <SiteFooter />
      </div>
      {!hideTrackFab && <TrackOrderFab />}
      {!hideNav && <BottomNav />}
    </>
  );
}
