"use client";

import { RunnerWorkspace } from "@/components/runner/RunnerWorkspace";
import { AppShell } from "@/ptero/components/AppShell";

/** Accepted CityU runs. Queried by runner uid, separate from the open board. */
export default function RunnerDeliveriesPage() {
  return (
    <AppShell>
      <RunnerWorkspace view="deliveries" scope="cityu" />
    </AppShell>
  );
}
