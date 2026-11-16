"use client";

import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";
import { RunnerQueueBell } from "@/components/RunnerQueueBell";
import { CustomerNotificationBell } from "@/components/CustomerNotificationBell";
import { AccountMenu } from "@/components/AccountMenu";
import { GuestCampusSwitch } from "@/components/GuestCampusSwitch";
import { useCampus } from "@/context/CampusContext";
import { useUser } from "@/context/UserContext";
import { runnerEntryHref } from "@/lib/nav";

/**
 * CityU channel picker: Taste groceries vs CityU canteens.
 */
export function CityUChannelSelector() {
  const { config } = useCampus();
  const { user, setMode, canRunnerMode } = useUser();
  const brand = config.brandLabel;
  const supermarket = config.supermarket;

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white">
      <header className="border-b border-white/10 bg-[#0c0c0c]/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2" aria-label={`${brand} home`}>
            <AppLogo size={44} className="h-11 w-11" />
            <span className="text-sm font-bold tracking-tight">{brand}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={runnerEntryHref({
                loggedIn: Boolean(user),
                canRunnerMode,
              })}
              onClick={() => {
                if (canRunnerMode) setMode("runner");
              }}
              className="inline-flex min-h-11 items-center rounded-full border border-emerald-400/50 bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-600"
            >
              Runner
            </Link>
            <RunnerQueueBell tone="dark" className="h-11 w-11 rounded-full" />
            <CustomerNotificationBell
              tone="dark"
              className="h-11 w-11 rounded-full"
            />
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:pt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ED1C24]">
          CityU campus delivery
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          What do you want delivered?
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Groceries from Taste at Festival Walk, or hot food from CityU
          canteens — both drop at your hall lobby.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/taste"
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1010] via-[#141414] to-[#0f0f0f] p-6 shadow-lg shadow-black/40 transition hover:border-[#ED1C24]/60"
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#ED1C24]/25 blur-3xl transition group-hover:bg-[#ED1C24]/35"
              aria-hidden
            />
            <p className="text-xs font-semibold uppercase tracking-wide text-[#ED1C24]">
              Supermarket
            </p>
            <h2 className="mt-2 text-2xl font-bold">{supermarket}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Browse Taste groceries at Festival Walk and get them to Halls
              1–12.
            </p>
            <span className="mt-6 inline-flex rounded-xl bg-[#ED1C24] px-4 py-2.5 text-sm font-bold text-white group-hover:bg-[#c9171e]">
              Shop {supermarket}
            </span>
          </Link>

          <div
            aria-disabled
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#10141a] via-[#121212] to-[#0f0f0f] p-6 opacity-60 shadow-lg shadow-black/40"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              Campus food
            </p>
            <h2 className="mt-2 text-2xl font-bold">CityU Canteens</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Hot food from CityU canteens is on the way.
            </p>
            <span className="mt-6 inline-flex rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-zinc-300">
              Coming soon
            </span>
          </div>
        </div>
        <GuestCampusSwitch />
      </main>
    </div>
  );
}
