"use client";

import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { AdminSupportChat } from "@/components/AdminSupportChat";
import { DockedUtilityBar } from "@/components/DockedUtilityBar";
import { FeedbackButton } from "@/components/FeedbackButton";
import { SiteFooter } from "@/components/SiteFooter";
import { ActiveOrdersProvider } from "@/lib/use-active-orders";

interface AppShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
  /** Hide docked Track Order bar (e.g. canteen menu pages). */
  hideTrackFab?: boolean;
}

export function AppShell({ children, hideNav, hideTrackFab }: AppShellProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <ActiveOrdersProvider>
      <div className={hideNav ? "" : "pb-28 md:pb-0"}>
        {children}
        <SiteFooter />
      </div>
      {!hideNav && !hideTrackFab && (
        <DockedUtilityBar onFeedback={() => setFeedbackOpen(true)} />
      )}
      {!hideNav && (
        <FeedbackButton
          controlledOpen={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          docked
        />
      )}
      {!hideNav && <AdminSupportChat />}
      {!hideNav && <BottomNav />}
    </ActiveOrdersProvider>
  );
}
