"use client";

import { RunnerWorkspace } from "@/components/runner/RunnerWorkspace";
import { AppShell } from "@/ptero/components/AppShell";

/** CityU available board — same workspace as CUHK, campus `cityu`. */
export default function RunnerDashboardPage() {
  return (
    <AppShell>
      <RunnerWorkspace view="available" scope="cityu" />
    </AppShell>
  );
}
