"use client";

import { BottomNav } from "@/components/BottomNav";
import { FeedbackButton } from "@/components/FeedbackButton";
import { SiteFooter } from "@/components/SiteFooter";

interface AppShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function AppShell({ children, hideNav }: AppShellProps) {
  return (
    <>
      <div className={hideNav ? "" : "pb-20 md:pb-0"}>
        {children}
        <SiteFooter />
      </div>
      {!hideNav && <FeedbackButton />}
      {!hideNav && <BottomNav />}
    </>
  );
}
