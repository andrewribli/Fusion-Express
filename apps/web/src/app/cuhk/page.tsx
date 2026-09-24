"use client";

import { useEffect } from "react";
import { CampusSelector } from "@/components/CampusSelector";
import { BootScreen } from "@/components/BootScreen";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";

/** Explicit CUHK entry — always shows CUHK channels; never bounces to /cityu. */
export default function CuhkChannelPage() {
  const { isReady, bootError, user } = useUser();
  const { setCampus, isReady: campusReady } = useCampus();

  useEffect(() => {
    // Guests browsing /cuhk get the CUHK menu context. Signed-in CityU users
    // keep their profile campus; CampusContext already prefers profile.
    if (!user || user.isGuest) setCampus("cuhk");
  }, [user, setCampus]);

  if (!isReady || !campusReady) {
    return <BootScreen error={bootError} />;
  }
  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }

  return <CampusSelector />;
}
