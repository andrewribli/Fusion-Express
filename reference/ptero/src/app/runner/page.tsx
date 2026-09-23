"use client";

import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { CAMPUS } from "@/config/campus";
import { useUser } from "@/context/AppState";

export default function RunnerIntroPage() {
  const { user, canRunnerMode } = useUser();

  return (
    <AppShell>
      <PrototypeBanner />
      <AppHeader showBack backHref="/" title="CityU runners" />
      <main className="mx-auto max-w-[480px] px-4 py-6 pb-28">
        <h1 className="text-xl font-extrabold">Run for {CAMPUS.brandName}</h1>
        <p className="mt-2 text-sm text-gray-600">
          Shop at {CAMPUS.supermarket} (Festival Walk), then drop groceries at Hall 1–12 lobbies.
          Customers never share a phone number. Runners must.
        </p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>CityU email required (@cityu.edu.hk or @my.cityu.edu.hk)</li>
          <li>Hong Kong mobile required so customers can reach you after accept</li>
          <li>You front the Taste bill; Ptero reimburses after the customer pays via Airwallex</li>
        </ul>
        {canRunnerMode ? (
          <Link
            href="/runner/dashboard"
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white"
          >
            Open runner dashboard
          </Link>
        ) : user && !user.isGuest ? (
          <Link
            href="/runner/register"
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-fusion-red py-3 text-sm font-bold text-white"
          >
            Add your phone and start running
          </Link>
        ) : (
          <Link
            href="/login?mode=signup&next=/runner/register"
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-fusion-red py-3 text-sm font-bold text-white"
          >
            Sign up with CityU email first
          </Link>
        )}
      </main>
    </AppShell>
  );
}
