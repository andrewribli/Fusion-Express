"use client";

import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";
import { AppLogo } from "@/components/AppLogo";
import { useCart } from "@/context/CartContext";
import { RESTAURANTS } from "@fusion-express/shared/canteen";

export default function CanteenIndexPage() {
  const { itemCount } = useCart();

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0c0c0c]/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <Link href="/" className="flex items-center gap-2" aria-label="GraceRun home">
              <AppLogo size={36} className="h-9 w-9" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">GraceRun</p>
                <p className="truncate text-[11px] text-emerald-400">Canteen</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/canteen/cart"
              className="relative rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/5"
            >
              Cart
              {itemCount > 0 ? ` (${itemCount})` : ""}
            </Link>
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-24 pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
          CUHK canteens
        </p>
        <h1 className="mt-2 text-2xl font-bold">GraceRun Canteen</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Flat delivery HK$10 · dorm lobby only · 10% college canteen discount
          when your runner matches
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Canteen checkout is separate from Fusion grocery checkout.
        </p>

        <ul className="mt-6 space-y-3">
          {RESTAURANTS.map((r) => (
            <li key={r.id}>
              {r.menuReady ? (
                <Link
                  href={`/canteen/${r.id}`}
                  className="block rounded-2xl border border-white/10 bg-[#141414] p-4 transition hover:border-emerald-400/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-white">{r.name}</h2>
                      <p className="mt-1 text-sm text-zinc-400">{r.blurb}</p>
                      <p className="mt-2 text-xs text-zinc-500">{r.hoursLabel}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-300">
                      Menu
                    </span>
                  </div>
                </Link>
              ) : (
                <div className="rounded-2xl border border-white/5 bg-[#121212] p-4 opacity-70">
                  <h2 className="text-lg font-bold text-white">{r.name}</h2>
                  <p className="mt-1 text-sm text-zinc-400">{r.blurb}</p>
                  <p className="mt-2 text-xs font-semibold text-zinc-500">
                    Coming soon
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
