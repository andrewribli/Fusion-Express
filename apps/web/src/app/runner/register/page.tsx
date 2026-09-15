"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { BootScreen } from "@/components/BootScreen";
import { useUser } from "@/context/UserContext";

/** Registration form removed — agreeing to terms activates the runner. */
export default function RunnerRegisterRedirectPage() {
  const router = useRouter();
  const { user, isReady, bootError } = useUser();

  useEffect(() => {
    if (!isReady || bootError) return;
    router.replace(user?.isRunner ? "/runner/dashboard" : "/runner/terms");
  }, [isReady, bootError, user, router]);

  if (!isReady || bootError) {
    return <BootScreen error={bootError} />;
  }

  return (
    <LakersWallpaper>
      <div className="flex min-h-screen items-center justify-center text-sm font-medium text-lakers-gold">
        Loading…
      </div>
    </LakersWallpaper>
  );
}
