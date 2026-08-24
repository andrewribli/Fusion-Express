"use client";

import { BottomNav } from "@/components/BottomNav";

interface AppShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function AppShell({ children, hideNav }: AppShellProps) {
  return (
    <>
      <div className={hideNav ? "" : "pb-20 md:pb-0"}>{children}</div>
      {!hideNav && <BottomNav />}
    </>
  );
}
