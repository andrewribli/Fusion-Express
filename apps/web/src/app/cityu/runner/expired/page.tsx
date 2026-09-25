"use client";

import { RunnerWorkspace } from "@/components/runner/RunnerWorkspace";
import { AppShell } from "@/ptero/components/AppShell";

export default function RunnerExpiredPage() {
  return (
    <AppShell>
      <RunnerWorkspace view="expired" scope="cityu" />
    </AppShell>
  );
}
