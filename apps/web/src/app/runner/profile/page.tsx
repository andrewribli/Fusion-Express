"use client";

import { ProfileView } from "@/components/ProfileView";
import { RequireRunner } from "@/components/RequireAuth";

/** Same profile, reached from the runner nav so runner chrome stays on. */
export default function RunnerProfilePage() {
  return (
    <RequireRunner>
      <ProfileView />
    </RequireRunner>
  );
}
