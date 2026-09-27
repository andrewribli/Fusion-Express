"use client";

import { RunnerWorkspace } from "@/components/runner/RunnerWorkspace";
import { AppShell } from "@/ptero/components/AppShell";

/** CityU runner history — same component as CUHK. */
export default function RunnerHistoryPage() {
  return (
    <AppShell>
      <RunnerWorkspace view="history" scope="cityu" />
    </AppShell>
  );
}
