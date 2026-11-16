"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TasteShopHome } from "@/components/TasteShopHome";
import { BootScreen } from "@/components/BootScreen";
import { useUser } from "@/context/UserContext";

export default function TastePage() {
  const router = useRouter();
  const { isReady, bootError, user } = useUser();
  const otherCampus = Boolean(user && !user.isGuest && user.campus === "cuhk");

  useEffect(() => {
    if (isReady && otherCampus) router.replace("/fusion");
  }, [isReady, otherCampus, router]);

  if (!isReady || otherCampus) {
    return <BootScreen error={bootError} />;
  }
  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }

  return <TasteShopHome />;
}
