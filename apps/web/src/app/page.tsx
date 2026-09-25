"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MarketingHome } from "@/components/MarketingHome";
import { BootScreen } from "@/components/BootScreen";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";
import { accessCampusForUser, campusHubPath } from "@/lib/campus-access";

function HomeContent() {
  const router = useRouter();
  const { isReady, bootError, user } = useUser();
  const { isReady: campusReady } = useCampus();

  const signedInCampus = accessCampusForUser(user);

  useEffect(() => {
    if (!isReady || !campusReady || !signedInCampus) return;
    router.replace(campusHubPath(signedInCampus));
  }, [campusReady, isReady, router, signedInCampus]);

  if (!isReady || !campusReady) {
    return <BootScreen error={bootError} />;
  }
  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }
  if (signedInCampus) {
    return <BootScreen />;
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
