"use client";

import Link from "next/link";
import { CanteenChrome } from "@/components/canteen/CanteenChrome";
import { getCollege } from "@/data/canteen/colleges";
import { RESTAURANTS } from "@/data/canteen/restaurants";
import { useCart } from "@/context/CartContext";

export default function CanteenIndexPage() {
  const { itemCount, subtotal } = useCart();

  return (
    <div className="min-h-screen bg-[#0c0c0c] pb-28 text-white">
      <CanteenChrome backHref="/" backLabel="Home" subtitle="Canteen" />

      <main className="mx-auto max-w-lg px-4 pt-5">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1010] via-[#121212] to-[#0d0d0d] p-5">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#ED1C24]/20 blur-3xl"
            aria-hidden
          />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ED1C24]">
            CUHK canteens
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            GraceRun Canteen
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
            Your canteen favorites, delivered to your dorm lobby.
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            Flat delivery HK$10 · dorm lobby only · 10% college canteen discount
            when your runner matches
          </p>
        </div>

        <h2 className="mt-7 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Restaurants
        </h2>
        <div className="mt-3 space-y-3">
          {RESTAURANTS.map((r) => {
            const college = getCollege(r.collegeId);
            return (
              <Link
                key={r.id}
                href={`/canteen/${r.id}`}
                className="block rounded-xl border border-white/10 bg-[#161616] p-4 transition hover:border-[#ED1C24]/50 hover:bg-[#1a1212]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-white">{r.name}</p>
                      {college ? (
                        <span className="rounded-md bg-[#ED1C24]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#ED1C24]">
                          {college.shortName} · 10% off
                        </span>
                      ) : null}
                      {!r.menuReady ? (
                        <span className="rounded-md bg-zinc-700/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-300">
                          Soon
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                      {r.blurb}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {r.hoursLabel} · HK${r.deliveryFee} delivery
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-[#ED1C24] px-3 py-1.5 text-xs font-semibold text-white">
                    {r.menuReady ? "Menu" : "Soon"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      {itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0c0c0c]/95 p-3 backdrop-blur">
          <div className="mx-auto max-w-lg">
            <Link
              href="/cart"
              className="flex w-full items-center justify-between rounded-xl bg-[#ED1C24] px-4 py-3.5 text-sm font-semibold text-white"
            >
              <span>
                View cart · {itemCount} item{itemCount === 1 ? "" : "s"}
              </span>
              <span>HK${subtotal.toFixed(subtotal % 1 === 0 ? 0 : 1)}</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
