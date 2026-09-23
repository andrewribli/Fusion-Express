"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShopHome } from "@/components/ShopHome";
import { BootScreen } from "@/components/BootScreen";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";

export default function FusionPage() {
  const router = useRouter();
  const { isReady, bootError, user } = useUser();
  const { setCampus } = useCampus();
  const otherCampus = Boolean(user && !user.isGuest && user.campus === "cityu");

  useEffect(() => {
    if (!isReady) return;
    if (otherCampus) {
      router.replace("/cityu/taste");
      return;
    }
    setCampus("cuhk");
  }, [isReady, otherCampus, router, setCampus]);

  if (!isReady || otherCampus) {
    return <BootScreen error={bootError} />;
  }
  if (bootError && !user) {
    return <BootScreen error={bootError} />;
  }

  return <ShopHome />;
}
