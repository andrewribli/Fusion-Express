"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { isRunnerPath, isShopPath } from "@/lib/nav";

/**
 * Keep app mode aligned with the route. Shop pages force customer chrome;
 * runner pages force runner chrome. Shared pages leave the saved mode alone.
 */
export function useModeSync(): void {
  const pathname = usePathname();
  const { canRunnerMode, mode, setMode } = useUser();

  useEffect(() => {
    if (isRunnerPath(pathname)) {
      if (canRunnerMode && mode !== "runner") setMode("runner");
      return;
    }
    if (isShopPath(pathname) && mode !== "customer") {
      setMode("customer");
    }
  }, [pathname, canRunnerMode, mode, setMode]);
}

/**
 * Nav chrome should follow the page the user is on, not a stale saved mode.
 * Prevents runner tabs lingering on the shop home after switching back.
 */
export function navModeForPath(
  pathname: string,
  savedMode: "customer" | "runner",
): "customer" | "runner" {
  if (isRunnerPath(pathname)) return "runner";
  if (isShopPath(pathname)) return "customer";
  return savedMode;
}
