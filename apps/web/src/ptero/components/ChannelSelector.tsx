"use client";

import Link from "next/link";
import { AccountMenu } from "@/ptero/components/AccountMenu";
import { AppLogo } from "@/ptero/components/AppLogo";
import { FeedbackButton } from "@/ptero/components/FeedbackButton";
import { RunnerQueueBell } from "@/ptero/components/RunnerQueueBell";
import { RunnerHeaderShortcuts } from "@/components/RunnerHeaderShortcuts";
import { GROCERY_SOURCES } from "@/lib/grocerySources";
import { CAMPUS } from "@/ptero/config/campus";
import { useUser } from "@/ptero/context/AppState";
import { useRunnerEntry } from "@/lib/use-runner-entry";
import { computeDeliveryFee, formatHkdAmount } from "@fusion-express/shared/delivery-pricing";

const headerIconClass =
  "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#161616] text-white hover:bg-[#1f1f1f]";

/**
 * Landing: Taste supermarket vs CityU canteens — mirrors CUHK CampusSelector.
 */
export function ChannelSelector() {
  const { setMode } = useUser();
  const runnerEntry = useRunnerEntry("cityu");
  const runnerCtaLabel =
    runnerEntry.decision.status === "ready" && runnerEntry.decision.runner
      ? "Runner mode"
      : "Become a runner";
  const runnerHeaderLabel =
    runnerEntry.decision.status === "ready" && runnerEntry.decision.runner
      ? "Runner"
      : "Become a runner";

  return (
    <div className="relative min-h-screen bg-[#0c0c0c] text-white">
      <header className="border-b border-white/10 bg-[#0c0c0c]/95">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-4">
          <Link href="/cityu" className="flex min-w-0 items-center gap-2" aria-label={`${CAMPUS.brandName} home`}>
            <AppLogo size={44} className="hidden h-11 w-11 sm:block" />
            <span className="hidden max-h-5 text-[13px] font-extrabold leading-5 tracking-tight min-[361px]:inline sm:text-sm">
              {CAMPUS.brandName}
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={runnerEntry.href}
              aria-busy={runnerEntry.loading || undefined}
              aria-disabled={runnerEntry.loading || undefined}
              onClick={(event) => {
                if (runnerEntry.loading) {
                  event.preventDefault();
                  return;
                }
                runnerEntry.onClick(event);
                if (runnerEntry.decision.status === "ready" && runnerEntry.decision.runner) {
                  setMode("runner");
                }
              }}
              className="hidden min-h-11 items-center rounded-full border-2 border-emerald-400/60 bg-emerald-500 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-400 sm:inline-flex"
            >
              {runnerHeaderLabel}
            </Link>
            {runnerEntry.decision.status === "ready" && runnerEntry.decision.runner ? (
              <RunnerQueueBell tone="dark" className={headerIconClass} />
            ) : null}
            {runnerEntry.decision.status === "ready" && runnerEntry.decision.runner ? (
              <div className="hidden sm:block">
                <RunnerHeaderShortcuts
                  ordersOnly
                  tone="dark"
                  className="h-11 w-11 rounded-full"
                />
              </div>
            ) : null}
            <div className="flex h-11 w-11 items-center justify-center">
              <AccountMenu tone="dark" />
            </div>
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
              {`AC1 and Ebeneezer's — HK$${formatHkdAmount(computeDeliveryFee({ campus: "cityu", sourceId: "ac1" }).base)} base plus a hall surcharge, 10% residence discount when your runner matches.`}
            </p>
            <span className="mt-6 inline-flex rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white group-hover:bg-emerald-400">
              Browse canteens
            </span>
          </Link>

          <Link
            href={runnerEntry.href}
            aria-busy={runnerEntry.loading || undefined}
            aria-disabled={runnerEntry.loading || undefined}
            onClick={(event) => {
              if (runnerEntry.loading) {
                event.preventDefault();
                return;
              }
              runnerEntry.onClick(event);
              if (runnerEntry.decision.status === "ready" && runnerEntry.decision.runner) {
                setMode("runner");
              }
            }}
            className="group relative overflow-hidden rounded-3xl border border-emerald-500/35 bg-gradient-to-br from-[#0f1a14] via-[#121212] to-[#0f0f0f] p-6 shadow-lg shadow-black/40 transition hover:border-emerald-400/70 sm:col-span-2"
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-500/25 blur-3xl transition group-hover:bg-emerald-500/35"
              aria-hidden
            />
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              Earn on campus
            </p>
            <h2 className="mt-2 text-2xl font-bold">{runnerCtaLabel}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Pick up Taste, Wellcome, or canteen orders and deliver to dorm lobbies.
              CityU email + HK mobile required.
            </p>
            <span className="mt-6 inline-flex rounded-xl border-2 border-emerald-400/50 bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white group-hover:bg-emerald-400">
              {runnerCtaLabel}
            </span>
          </Link>
        </div>
      </main>
      <FeedbackButton />
    </div>
  );
}
