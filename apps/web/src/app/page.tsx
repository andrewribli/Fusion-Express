"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CampusSelector } from "@/components/CampusSelector";
import { MarketingHome } from "@/components/MarketingHome";
import { BootScreen } from "@/components/BootScreen";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isReady, bootError, user } = useUser();
  const { isReady: campusReady } = useCampus();
  // Only the login page's "Continue as Guest" opts into the menu without an
  // account; a stored guest flag must not hide the homepage on later visits.
  const guestParam = searchParams.get("guest") === "1";
  const signedIn = Boolean(user && !user.isGuest);
  // Profile campus only — never localStorage. Guests who last visited Ptero
  // must still land on the GraceRun homepage, not /cityu.
  const profileCampus = user && !user.isGuest ? user.campus : null;
  const toPtero = isReady && campusReady && signedIn && profileCampus === "cityu";
  const browsing = signedIn || guestParam;

  useEffect(() => {
    if (toPtero) router.replace("/cityu");
  }, [toPtero, router]);

  if (!isReady || !campusReady || toPtero) {
    return <BootScreen error={bootError} />;
  }
  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }
  if (!browsing) {
    return <MarketingHome />;
  }
  // Signed-in CUHK (or guest browse): CUHK channel picker. CityU signed-in
  // users never reach here — they were redirected to /cityu.
  return <CampusSelector />;
}

export default function RootPage() {
  return (
    <Suspense fallback={<BootScreen />}>
      <HomeContent />
    </Suspense>
  );
}
