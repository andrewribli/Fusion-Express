"use client";

import Link from "next/link";
import { AppHeader } from "@/ptero/components/AppHeader";
import { AppShell } from "@/ptero/components/AppShell";
import { PrototypeBanner } from "@/ptero/components/PrototypeBanner";
import { CAMPUS } from "@/ptero/config/campus";
import { useUser } from "@/ptero/context/AppState";

export default function ProfilePage() {
  const { user, signOut, canRunnerMode } = useUser();

  return (
    <AppShell>
      <PrototypeBanner />
      <AppHeader showBack backHref="/cityu" title="Account" />
      <main className="mx-auto max-w-[480px] px-4 py-4 pb-28">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Campus
          </p>
          <p className="mt-1 text-lg font-bold">{CAMPUS.brandName}</p>
          <p className="text-xs text-gray-500">
            campus: <span className="font-mono">{CAMPUS.id}</span> — future site will let you
            switch to CUHK without a separate app.
          </p>
          <p className="mt-3 text-sm font-semibold">{user?.name ?? "Guest"}</p>
          <p className="text-xs text-gray-500">
            {user?.email ?? "No email · guest checkout does not need a phone number"}
          </p>
        </div>
        <div className="mt-3 space-y-2">
          {canRunnerMode ? (
            <Link
              href="/cityu/runner/dashboard"
              className="block rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-bold text-white"
            >
              Switch to Runner
            </Link>
          ) : (
            <Link
              href="/cityu/runner"
              className="block rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-800"
            >
              Become a CityU runner
            </Link>
          )}
          {user && !user.isGuest ? (
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  await signOut();
                  // Guest after sign-out: marketing home, not the CityU shop.
                  window.location.href = "/";
                })();
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="block rounded-xl bg-fusion-red px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Sign in
            </Link>
          )}
        </div>
      </main>
    </AppShell>
  );
}
