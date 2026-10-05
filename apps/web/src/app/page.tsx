"use client";

import { Suspense } from "react";
import { MarketingHome } from "@/components/MarketingHome";
import { BootScreen } from "@/components/BootScreen";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";

function HomeContent() {
  const { isReady, bootError, user } = useUser();
  const { isReady: campusReady } = useCampus();

  // `/` always shows the CUHK / CityU selector. A signed-in profile, a
  // leftover `gracerun_campus` value, or a CityU Firebase session must not
  // replace this page with `/cityu`. Cross-campus isolation lives on the
  // campus routes themselves, not here.
  if (!isReady || !campusReady) {
    return <BootScreen error={bootError} />;
  }
  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }
  return <MarketingHome />;
}

export default function RootPage() {
  return (
    <Suspense fallback={<BootScreen />}>
      <HomeContent />
    </Suspense>
  );
}
