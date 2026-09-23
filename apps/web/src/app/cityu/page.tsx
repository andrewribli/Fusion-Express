"use client";

import { useEffect } from "react";
import { CampusSelector } from "@/components/CampusSelector";
import { CityUChannelSelector } from "@/components/CityUChannelSelector";
import { BootScreen } from "@/components/BootScreen";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";

export default function CityUChannelPage() {
  const { isReady, bootError, user } = useUser();
  const { campus, setCampus, isReady: campusReady } = useCampus();

  useEffect(() => {
    setCampus("cityu");
  }, [setCampus]);

  if (!isReady || !campusReady) {
    return <BootScreen error={bootError} />;
  }
  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }

  return campus === "cuhk" ? <CampusSelector /> : <CityUChannelSelector />;
}
