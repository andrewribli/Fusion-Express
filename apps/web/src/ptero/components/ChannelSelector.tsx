"use client";

import Link from "next/link";
import { AccountMenu } from "@/ptero/components/AccountMenu";
import { AppLogo } from "@/ptero/components/AppLogo";
import { CustomerNotificationBell } from "@/ptero/components/CustomerNotificationBell";
import { FeedbackButton } from "@/ptero/components/FeedbackButton";
import { RunnerQueueBell } from "@/ptero/components/RunnerQueueBell";
import { GROCERY_SOURCES } from "@/lib/grocerySources";
import { CAMPUS } from "@/ptero/config/campus";

const headerIconClass =
  "h-11 w-11 rounded-full border-white/15 bg-[#161616] text-white hover:bg-[#1f1f1f]";

/**
 * Landing: Taste supermarket vs CityU canteens — mirrors CUHK CampusSelector.
 */
export function ChannelSelector() {
  return (
    <div className="relative min-h-screen bg-[#0c0c0c] text-white">
      <header className="border-b border-white/10 bg-[#0c0c0c]/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/cityu" className="flex items-center gap-2" aria-label={`${CAMPUS.brandName} home`}>
            <AppLogo size={44} className="h-11 w-11" />
            <span className="text-sm font-bold tracking-tight">{CAMPUS.brandName}</span>
          </Link>
          <div className="flex items-center gap-2">
            <CustomerNotificationBell tone="dark" className={headerIconClass} />
            <RunnerQueueBell tone="dark" className={headerIconClass} />
            <AccountMenu tone="dark" />
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
          Groceries from Taste or Wellcome, or hot food from CityU canteens — all
          drop at your dorm lobby. Same {CAMPUS.brandName} runners.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/cityu/taste"
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1010] via-[#141414] to-[#0f0f0f] p-6 shadow-lg shadow-black/40 transition hover:border-[#ED1C24]/60"
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#ED1C24]/25 blur-3xl transition group-hover:bg-[#ED1C24]/35"
              aria-hidden
            />
            <p className="text-xs font-semibold uppercase tracking-wide text-[#ED1C24]">
              Supermarket · Premium
            </p>
            <h2 className="mt-2 text-2xl font-bold">Taste</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {GROCERY_SOURCES.taste.name}. {GROCERY_SOURCES.taste.walkMinutes} min walk,
              HK${GROCERY_SOURCES.taste.deliveryFee} delivery.
            </p>
            <span className="mt-6 inline-flex rounded-xl bg-[#ED1C24] px-4 py-2.5 text-sm font-bold text-white group-hover:bg-[#c9171e]">
              Shop Taste
            </span>
          </Link>

          <Link
            href="/cityu/wellcome"
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#101a14] via-[#121212] to-[#0f0f0f] p-6 shadow-lg shadow-black/40 transition hover:border-emerald-400/50"
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-500/20 blur-3xl transition group-hover:bg-emerald-500/30"
              aria-hidden
            />
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              Supermarket · Value
            </p>
            <h2 className="mt-2 text-2xl font-bold">Wellcome</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {GROCERY_SOURCES.wellcome.name}. {GROCERY_SOURCES.wellcome.walkMinutes} min
              walk, HK${GROCERY_SOURCES.wellcome.deliveryFee} delivery.
            </p>
            <span className="mt-6 inline-flex rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white group-hover:bg-emerald-400">
              Shop Wellcome
            </span>
          </Link>

          <Link
            href="/cityu/canteen"
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#10141a] via-[#121212] to-[#0f0f0f] p-6 shadow-lg shadow-black/40 transition hover:border-emerald-400/50 sm:col-span-2"
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
              AC1–AC3, hall canteens, and City Chinese — flat HK$10 delivery, 10%
              residence discount when your runner matches.
            </p>
            <span className="mt-6 inline-flex rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white group-hover:bg-emerald-400">
              Browse canteens
            </span>
          </Link>
        </div>
      </main>
      <FeedbackButton />
    </div>
  );
}
