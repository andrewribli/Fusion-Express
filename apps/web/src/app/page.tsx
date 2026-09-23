"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CampusSelector } from "@/components/CampusSelector";
import { CityUChannelSelector } from "@/components/CityUChannelSelector";
import { MarketingHome } from "@/components/MarketingHome";
import { BootScreen } from "@/components/BootScreen";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";

function HomeContent() {
  const searchParams = useSearchParams();
  const { isReady, bootError, user, isGuestBrowsing, startGuestBrowse } =
    useUser();
  const { isReady: campusReady } = useCampus();
  const guestParam = searchParams.get("guest") === "1";

  useEffect(() => {
    if (guestParam && !isGuestBrowsing && (!user || user.isGuest)) {
      startGuestBrowse();
    }
  }, [guestParam, isGuestBrowsing, user, startGuestBrowse]);

  if (!isReady || !campusReady) {
    return <BootScreen error={bootError} />;
  }
  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }

  const signedIn = Boolean(user && !user.isGuest);
  const browsing =
    signedIn || isGuestBrowsing || guestParam || Boolean(user?.isGuest);

  if (!browsing) {
    return <MarketingHome />;
  }

  if (user?.campus === "cityu") {
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
