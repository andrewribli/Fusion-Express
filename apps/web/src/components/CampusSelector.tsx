"use client";

import Link from "next/link";
import { AppLogo } from "@/components/AppLogo";
import { MobileAppHeader } from "@/components/MobileAppHeader";
import { RunnerQueueBell } from "@/components/RunnerQueueBell";
import { GuestCampusSwitch } from "@/components/GuestCampusSwitch";
import { useCampus } from "@/context/CampusContext";
import { useBothCarts } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { runnerEntryHref } from "@/lib/nav";
import { useRouter } from "next/navigation";

/**
 * CUHK channel picker: Fusion groceries vs campus canteens.
 */
export function CampusSelector() {
  const { config } = useCampus();
  const { user, setMode, canRunnerMode } = useUser();
  const { fusion, canteen } = useBothCarts();
  const router = useRouter();
  const brand = config.brandLabel;
  const cartCount = fusion.itemCount + canteen.itemCount;
  const headerIconClass =
    "h-11 w-11 rounded-xl border border-white/15 bg-[#161616] text-white hover:bg-[#1f1f1f]";

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white">
      <MobileAppHeader
        tone="dark"
        logo={<AppLogo size={32} className="h-8 w-8" />}
        brandName={brand}
        homeHref="/"
        cartHref={canteen.itemCount > 0 ? "/canteen/cart" : "/cart"}
        cartCount={cartCount}
        bell={<RunnerQueueBell className={headerIconClass} />}
        onSearchClick={() => router.push("/fusion#search")}
        menuTitle="Menu"
        menuLinks={[
          { href: "/canteen", label: "Canteens" },
          { href: "/fusion", label: "Fusion groceries" },
          { href: "/cityu", label: "Switch to CityU" },
          {
            href: runnerEntryHref({
              loggedIn: Boolean(user),
              canRunnerMode,
            }),
            label: canRunnerMode ? "Runner dashboard" : "Become a runner",
            onClick: () => {
              if (canRunnerMode) setMode("runner");
            },
          },
          { href: user ? "/profile" : "/login", label: user ? "Account" : "Sign in" },
        ]}
      />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:pt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ED1C24]">
          CUHK campus delivery
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          What do you want delivered?
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Groceries from Fusion, or hot food from campus canteens — both drop at
          your dorm lobby. Same GraceRun runners, same pay-after-delivery flow.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/fusion"
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1010] via-[#141414] to-[#0f0f0f] p-6 shadow-lg shadow-black/40 transition hover:border-[#ED1C24]/60"
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#ED1C24]/25 blur-3xl transition group-hover:bg-[#ED1C24]/35"
              aria-hidden
            />
            <p className="text-xs font-semibold uppercase tracking-wide text-[#ED1C24]">
              Supermarket
            </p>
            <h2 className="mt-2 text-2xl font-bold">Fusion</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Browse Fusion groceries and get them to your hall lobby. Pay the
              exact receipt after delivery.
            </p>
            <span className="mt-6 inline-flex rounded-xl bg-[#ED1C24] px-4 py-2.5 text-sm font-bold text-white group-hover:bg-[#c9171e]">
              Shop Fusion
            </span>
          </Link>

          <Link
            href="/canteen"
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#10141a] via-[#121212] to-[#0f0f0f] p-6 shadow-lg shadow-black/40 transition hover:border-emerald-400/50"
          >
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-500/20 blur-3xl transition group-hover:bg-emerald-500/30"
              aria-hidden
            />
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
              Campus food
            </p>
            <h2 className="mt-2 text-2xl font-bold">Canteen</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Benjamin Franklin, UC, and more — flat HK$10 delivery, 10% college
              discount when your runner matches.
            </p>
            <span className="mt-6 inline-flex rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white group-hover:bg-emerald-400">
              Browse canteens
            </span>
          </Link>
        </div>
        <GuestCampusSwitch />
      </main>
    </div>
  );
}
