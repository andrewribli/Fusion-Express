"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CampusSelector } from "@/components/CampusSelector";
import { CityUChannelSelector } from "@/components/CityUChannelSelector";
import { MarketingHome } from "@/components/MarketingHome";
import { BootScreen } from "@/components/BootScreen";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";

function HomeContent() {
  const searchParams = useSearchParams();
  const { isReady, bootError, user } = useUser();
  const { campus, isReady: campusReady } = useCampus();
  // Only the login page's "Continue as Guest" opts into the menu without an
  // account; a stored guest flag must not hide the homepage on later visits.
  const guestParam = searchParams.get("guest") === "1";

  if (!isReady || !campusReady) {
    return <BootScreen error={bootError} />;
  }
  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }

  const signedIn = Boolean(user && !user.isGuest);
  if (!signedIn && !guestParam) {
    return <MarketingHome />;
  }

  if (campus === "cityu") {
    return <CityUChannelSelector />;
  }
  return <CampusSelector />;
}

export default function RootPage() {
  return (
    <Suspense fallback={<BootScreen />}>
      <HomeContent />
    </Suspense>
  );
}
