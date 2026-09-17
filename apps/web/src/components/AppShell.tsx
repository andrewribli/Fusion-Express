"use client";

import { BottomNav } from "@/components/BottomNav";
import { AdminSupportChat } from "@/components/AdminSupportChat";
import { SiteFooter } from "@/components/SiteFooter";
import { TrackOrderFab } from "@/components/TrackOrderFab";
import { ActiveOrdersProvider } from "@/lib/use-active-orders";

interface AppShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function AppShell({ children, hideNav }: AppShellProps) {
  return (
    <ActiveOrdersProvider>
      <div className={hideNav ? "" : "pb-20 md:pb-0"}>
        {children}
        <SiteFooter />
      </div>
      {!hideNav && <TrackOrderFab />}
      {!hideNav && <AdminSupportChat />}
      {!hideNav && <BottomNav />}
    </ActiveOrdersProvider>
  );
}
