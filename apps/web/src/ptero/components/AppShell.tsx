"use client";

import { BottomNav } from "@/ptero/components/BottomNav";
import { SiteFooter } from "@/ptero/components/SiteFooter";
import { TrackOrderFab } from "@/ptero/components/TrackOrderFab";

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
