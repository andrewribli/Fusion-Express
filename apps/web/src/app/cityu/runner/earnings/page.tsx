"use client";

import { RunnerWorkspace } from "@/components/runner/RunnerWorkspace";
import { AppShell } from "@/ptero/components/AppShell";

export default function RunnerEarningsPage() {
  return (
    <AppShell>
      <RunnerWorkspace view="earnings" scope="cityu" />
    </AppShell>
  );
}
