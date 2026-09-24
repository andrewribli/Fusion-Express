"use client";

import { useEffect } from "react";
import { CampusSelector } from "@/components/CampusSelector";
import { BootScreen } from "@/components/BootScreen";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";

/** Explicit CUHK entry — always shows CUHK channels; never bounces to /cityu. */
export default function CuhkChannelPage() {
  const { isReady, bootError, user } = useUser();
  const { forceCampus, isReady: campusReady } = useCampus();

  useEffect(() => {
    // /cuhk is always GraceRun chrome — wins over a CityU/Ptero profile campus.
    forceCampus("cuhk");
    return () => forceCampus(null);
  }, [forceCampus]);

  if (!isReady || !campusReady) {
    return <BootScreen error={bootError} />;
  }
  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }

  return <CampusSelector />;
}
