"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MarketingHome } from "@/components/MarketingHome";
import { BootScreen } from "@/components/BootScreen";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";
import { isCampusId } from "@fusion-express/shared/campus";
import { campusHubPath } from "@/lib/campus-access";

function HomeContent() {
  const router = useRouter();
  const { isReady, bootError, user } = useUser();
  const { isReady: campusReady } = useCampus();

  // Redirect only when Firebase has a real signed-in profile and that
  // profile's campus is known. CityU sign-out used to leave the Firebase
  // user signed in and `gracerun_campus` stuck on `cityu`, so this page
  // replaced `/` with `/cityu` on every visit. Guests stay on the marketing
  // home and choose CUHK or CityU. A manual visit to `/cityu` is unchanged.
  const signedInCampus =
    user?.uid && !user.isGuest && isCampusId(user.campus) ? user.campus : null;

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
