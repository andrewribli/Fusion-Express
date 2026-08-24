"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !user) {
      router.replace("/");
    }
  }, [user, isReady, router]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
