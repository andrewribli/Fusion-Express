"use client";

import { TasteShopHome } from "@/components/TasteShopHome";
import { BootScreen } from "@/components/BootScreen";
import { useUser } from "@/context/UserContext";

export default function TastePage() {
  const { isReady, bootError, user } = useUser();

  if (!isReady) {
    return <BootScreen error={bootError} />;
  }
  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }

  return <TasteShopHome />;
}
