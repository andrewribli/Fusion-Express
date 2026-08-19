"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function RunnerIndexPage() {
  const router = useRouter();
  const { user, isReady, termsAccepted } = useUser();

  useEffect(() => {
    if (!isReady) return;
    if (user?.isRunner) {
      router.replace("/runner/dashboard");
    } else if (termsAccepted) {
      router.replace("/runner/register");
    } else {
      router.replace("/runner/terms");
    }
  }, [isReady, user, termsAccepted, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
      Loading…
    </div>
  );
}
