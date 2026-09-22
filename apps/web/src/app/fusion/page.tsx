"use client";

import { ShopHome } from "@/components/ShopHome";
import { BootScreen } from "@/components/BootScreen";
import { useUser } from "@/context/UserContext";

export default function FusionPage() {
  const { isReady, bootError, user } = useUser();

  if (!isReady) {
    return <BootScreen error={bootError} />;
  }
  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }

  return <ShopHome />;
}
