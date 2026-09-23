"use client";

import { useEffect } from "react";
import { ShopHome } from "@/components/ShopHome";
import { BootScreen } from "@/components/BootScreen";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";

export default function FusionPage() {
  const { isReady, bootError, user } = useUser();
  const { setCampus } = useCampus();

  useEffect(() => {
    setCampus("cuhk");
  }, [setCampus]);

  if (!isReady) {
    return <BootScreen error={bootError} />;
  }
  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }

  return <ShopHome />;
}
