"use client";

import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";
import { RunnerQueueBell } from "@/components/RunnerQueueBell";
import { AccountMenu } from "@/components/AccountMenu";
import { useCampus } from "@/context/CampusContext";

/**
 * CityU channel picker: Taste groceries vs CityU canteens.
 */
export function CityUChannelSelector() {
  const { config } = useCampus();
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
            <RunnerQueueBell className="h-11 w-11 rounded-full border-white/15 bg-[#161616] text-white hover:bg-[#1f1f1f]" />
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

          <Link
            href="/canteen?campus=cityu"
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#10141a] via-[#121212] to-[#0f0f0f] p-6 shadow-lg shadow-black/40 transition hover:border-emerald-400/50"
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-500/20 blur-3xl transition group-hover:bg-emerald-500/30"
              aria-hidden
            />
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              Campus food
            </p>
            <h2 className="mt-2 text-2xl font-bold">CityU Canteens</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Coming soon on this unified site — CUHK canteens remain available
              under CUHK for now.
            </p>
            <span className="mt-6 inline-flex rounded-xl bg-emerald-500/80 px-4 py-2.5 text-sm font-bold text-white">
              Browse canteens
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}
