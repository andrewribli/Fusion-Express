"use client";

import Link from "next/link";
import { AppHeader } from "@/ptero/components/AppHeader";
import { AppShell } from "@/ptero/components/AppShell";
import { PrototypeBanner } from "@/ptero/components/PrototypeBanner";
import { CAMPUS } from "@/ptero/config/campus";
import { useRunnerEntry } from "@/lib/use-runner-entry";

export default function RunnerIntroPage() {
  const runnerEntry = useRunnerEntry("cityu");
  const label =
    runnerEntry.decision.status === "ready" && runnerEntry.decision.runner
      ? "Open runner dashboard"
      : runnerEntry.decision.status === "ready" &&
          runnerEntry.href.startsWith("/cityu/runner/register")
        ? "Add your phone and start running"
        : "Sign up with CityU email first";

  return (
    <AppShell>
      <PrototypeBanner />
      <AppHeader showBack backHref="/cityu" title="CityU runners" />
      <main className="mx-auto max-w-[480px] px-4 py-6 pb-28">
        <h1 className="text-xl font-extrabold">Run for {CAMPUS.brandName}</h1>
        <p className="mt-2 text-sm text-gray-600">
          Shop at {CAMPUS.supermarket} (Festival Walk), then drop groceries at Hall 1–12 lobbies.
          Customers never share a phone number. Runners must.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>CityU email required (@cityu.edu.hk or @my.cityu.edu.hk)</li>
          <li>Hong Kong mobile required so customers can reach you after accept</li>
          <li>You front the Taste bill; GraceRun reimburses after the customer pays via Airwallex</li>
        </ul>
        <Link
          href={runnerEntry.href}
          aria-busy={runnerEntry.loading || undefined}
          aria-disabled={runnerEntry.loading || undefined}
          onClick={runnerEntry.onClick}
          className={`mt-6 flex w-full items-center justify-center rounded-xl py-3 text-sm font-bold text-white ${
            runnerEntry.decision.status === "ready" && runnerEntry.decision.runner
              ? "bg-emerald-500"
              : "bg-fusion-red"
          } ${runnerEntry.loading ? "opacity-60" : ""}`}
        >
          {runnerEntry.loading ? "Loading…" : label}
        </Link>
      </main>
    </AppShell>
  );
}
