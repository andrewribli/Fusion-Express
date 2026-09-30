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
function firebaseSessionPresent(): boolean {
  if (typeof window === "undefined") return false;
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
  const authSession = Boolean(user) || firebaseSessionPresent();
  // Only block navigation while Auth itself is still restoring. A Firebase
  // user with a null React profile is still signed in (signup profile write
  // may have failed) — do not leave the card on "Loading…" forever.
  const profilePending = !isReady && !user && authSession;
  const decision = resolveRunnerEntry({
    authReady: isReady || authSession,
    profilePending,
    signedIn: authSession,
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
