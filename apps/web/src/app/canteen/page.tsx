"use client";

import Image from "next/image";
import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";
import { AppLogo } from "@/components/AppLogo";
import { useCart } from "@/context/CartContext";
import {
  CAMPUS_LABELS,
  RESTAURANTS,
  type CanteenCampus,
  type CanteenRestaurant,
} from "@fusion-express/shared/canteen";

const CAMPUS_ORDER: CanteenCampus[] = ["cuhk", "cityu"];

function RestaurantCard({ r }: { r: CanteenRestaurant }) {
  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {r.logo ? (
          <Image
            src={r.logo}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-xl object-contain bg-white p-1"
          />
        ) : null}
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white">{r.name}</h2>
          <p className="mt-1 text-sm text-zinc-400">{r.blurb}</p>
          <p className="mt-2 text-xs text-zinc-500">{r.hoursLabel}</p>
        </div>
      </div>
      {r.menuReady ? (
        <span className="shrink-0 rounded-lg bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-300">
          Menu
        </span>
      ) : (
        <span className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-zinc-400">
          Soon
        </span>
      )}
    </div>
  );

  if (r.menuReady) {
    return (
      <Link
        href={`/canteen/${r.id}`}
        className="block rounded-2xl border border-white/10 bg-[#141414] p-4 transition hover:border-emerald-400/40"
      >
        {body}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-[#121212] p-4 opacity-70">
      {body}
    </div>
  );
}

export default function CanteenIndexPage() {
  const { itemCount } = useCart();

  const byCampus = CAMPUS_ORDER.map((campus) => ({
    campus,
    restaurants: RESTAURANTS.filter((r) => r.campus === campus),
  })).filter((g) => g.restaurants.length > 0);

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
          Campus canteens
        </p>
        <h1 className="mt-2 text-2xl font-bold">GraceRun Canteen</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Flat delivery HK$10 · dorm lobby only · 10% college canteen discount
          when your runner matches
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Canteen checkout is separate from Fusion grocery checkout.
        </p>

        {byCampus.map(({ campus, restaurants }) => (
          <section key={campus} className="mt-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-300">
              {CAMPUS_LABELS[campus]}
            </h2>
            <ul className="mt-3 space-y-3">
              {restaurants.map((r) => (
                <li key={r.id}>
                  <RestaurantCard r={r} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
