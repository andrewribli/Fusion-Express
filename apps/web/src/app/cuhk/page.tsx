"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CampusSelector } from "@/components/CampusSelector";
import { BootScreen } from "@/components/BootScreen";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";

export default function CuhkChannelPage() {
  const router = useRouter();
  const { isReady, bootError, user } = useUser();
  const { campus, setCampus, isReady: campusReady } = useCampus();
  const toPtero = isReady && campusReady && campus === "cityu";

  useEffect(() => {
    if (toPtero) {
      router.replace("/cityu");
      return;
    }
    setCampus("cuhk");
  }, [toPtero, router, setCampus]);

  if (!isReady || !campusReady || toPtero) {
    return <BootScreen error={bootError} />;
  }
  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }

  return <CampusSelector />;
}
