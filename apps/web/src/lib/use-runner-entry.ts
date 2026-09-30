"use client";

import type { MouseEvent } from "react";
import { useUser } from "@/context/UserContext";
import { getAuthClient } from "@/lib/firebase";
import {
  resolveRunnerEntry,
  type RunnerCampus,
  type RunnerEntryDecision,
} from "@/lib/runner-entry";

/** Firebase session exists, but UserContext has not applied that profile yet. */
function profileStillLoading(isReady: boolean, hasUser: boolean): boolean {
  if (!isReady || hasUser || typeof window === "undefined") return false;
  try {
    return Boolean(getAuthClient().currentUser);
  } catch {
    return false;
  }
}

export type RunnerEntryControl = {
  decision: RunnerEntryDecision;
  /** `#runner` while auth is loading, otherwise the real path. */
  href: string;
  loading: boolean;
  onClick: (event: MouseEvent) => void;
};

/**
 * Runner icon / Switch to Runner. Reads the shared Firebase user
 * (`UserContext`), the same session the account menu uses.
 */
export function useRunnerEntry(campus: RunnerCampus): RunnerEntryControl {
  const { user, isReady, canRunnerMode, setMode } = useUser();
  const decision = resolveRunnerEntry({
    authReady: isReady,
    profilePending: profileStillLoading(isReady, Boolean(user)),
    signedIn: Boolean(user),
    runner: Boolean(user && !user.isGuest && (canRunnerMode || user.isRunner)),
    campus,
  });
  const loading = decision.status === "loading";
  const href = decision.status === "ready" ? decision.href : "#runner";

  function onClick(event: MouseEvent) {
    if (loading || decision.status !== "ready") {
      event.preventDefault();
      return;
    }
    if (decision.runner) setMode("runner");
  }

  return { decision, href, loading, onClick };
}
