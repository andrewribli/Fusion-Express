"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CampusSelector } from "@/components/CampusSelector";
import { CityUChannelSelector } from "@/components/CityUChannelSelector";
import { MarketingHome } from "@/components/MarketingHome";
import { UnpaidOrdersBanner } from "@/components/UnpaidOrdersBanner";
import { BootScreen } from "@/components/BootScreen";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";

function HomeContent() {
  const searchParams = useSearchParams();
  const { isReady, bootError, user } = useUser();
  const { campus, isReady: campusReady } = useCampus();
  // Only the login page's browse-without-sign-in opts into the menu without an
  // account; a stored guest flag must not hide the homepage on later visits.
  const guestParam = searchParams.get("guest") === "1";

  if (!isReady || !campusReady) {
    return <BootScreen error={bootError} />;
  }
  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }

  // Firebase session (including legacy guest_* accounts) must enter the app so
  // unpaid orders, track, and admin chat are reachable. Marketing is for
  // signed-out visitors only.
  const hasSession = Boolean(user?.uid);
  if (!hasSession && !guestParam) {
    return <MarketingHome />;
  }

  return (
    <AppShell>
      {hasSession ? <UnpaidOrdersBanner tone="dark" /> : null}
      {campus === "cityu" ? <CityUChannelSelector /> : <CampusSelector />}
    </AppShell>
  );
}

export default function RootPage() {
  return (
    <Suspense fallback={<BootScreen />}>
      <HomeContent />
    </Suspense>
  );
}
