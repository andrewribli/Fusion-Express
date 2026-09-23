"use client";

import { CampusSelector } from "@/components/CampusSelector";
import { CityUChannelSelector } from "@/components/CityUChannelSelector";
import { BootScreen } from "@/components/BootScreen";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";

/**
 * Homepage goes straight to the channel picker — no university landing page.
 * CityU layout only for signed-in users whose signup campus is CityU.
 * Everyone else (guests, CUHK accounts) sees CUHK Fusion / Canteen.
 */
export default function RootPage() {
  const { isReady, bootError, user } = useUser();
  const { isReady: campusReady } = useCampus();

  if (!isReady || !campusReady) {
    return <BootScreen error={bootError} />;
  }
  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }

  if (user?.campus === "cityu") {
    return <CityUChannelSelector />;
  }
  return <CampusSelector />;
}
