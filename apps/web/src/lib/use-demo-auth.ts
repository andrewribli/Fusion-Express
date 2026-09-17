"use client";

import { useSyncExternalStore } from "react";
import { isDemoAuth, isStagingEnvVar } from "@/lib/constants";

export function useDemoAuth() {
  return useSyncExternalStore(() => () => {}, isDemoAuth, isStagingEnvVar);
}
