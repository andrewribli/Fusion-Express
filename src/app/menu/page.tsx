"use client";

import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { FelixOrderCard } from "@/components/FelixOrderCard";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { RequireAuth } from "@/components/RequireAuth";
import { SECTION_META } from "@/data/aisles";
import { useCart } from "@/context/CartContext";
import { RUNNER_JUDGMENT_NOTE } from "@/lib/constants";
import { getMenuItemById } from "@/lib/menu";
import { formatMenuPrice } from "@/lib/types";

const FEATURED_IDS = [
  "pocari-sweat-largest",
  "pagoda-kumquat-lemon-bundle",
  "tao-ti-mandarin-lemon",
  "shin-ramen-bowl",
  "fanta-mini-6pack-orange",
] as const;

export default function MenuPage() {
  const { addItem } = useCart();
  const featured = FEATURED_IDS.map((id) => getMenuItemById(id)).filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );

  return (
    <RequireAuth>
      <AppShell>
        <div className="min-h-screen bg-gradient-to-b from-amber-50 to-gray-50">
          <AppHeader showBack backHref="/home" title="Menu" />

          <main className="mx-auto max-w-[480px] px-4 py-6">
            <h1 className="text-xl font-bold text-gray-900">🏪 Shop Fusion</h1>
            <p className="mt-1 text-sm text-gray-500">
              Pick a section, then browse aisles.
            </p>

            <PriceDisclaimer className="mt-3" />

            <div className="mt-4 space-y-4">
              {(["refrigerated", "dry"] as const).map((section) => {
                const meta = SECTION_META[section];
                return (
                  <Link
                    key={section}
                    href={`/browse/${section}`}
                    className="block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition-transform active:scale-[0.98]"
                  >
                    <div
                      className={`flex items-center gap-4 p-6 ${
                        section === "refrigerated"
                          ? "bg-gradient-to-r from-sky-50 to-white"
                          : "bg-gradient-to-r from-amber-50 to-white"
                      }`}
                    >
                      <span className="text-5xl">{meta.emoji}</span>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">
                          {meta.title}
                        </h2>
                        <p className="mt-0.5 text-sm text-gray-500">{meta.subtitle}</p>
                        <span className="mt-2 inline-block text-sm font-semibold text-fusion-red">
                          Browse →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6">
              <FelixOrderCard />
            </div>

            <section className="mt-6">
              <h2 className="text-sm font-bold text-gray-900">Popular requests</h2>
              <p className="mt-1 text-xs text-gray-500">{RUNNER_JUDGMENT_NOTE}</p>
              <ul className="mt-3 space-y-3">
                {featured.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                    <p className="mt-0.5 text-base font-bold text-fusion-red">
                      {formatMenuPrice(item)}
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        est.
                      </span>
                    </p>
                    {item.itemNote && (
                      <p className="mt-1 text-xs text-amber-700">{item.itemNote}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => addItem(item)}
                      className="mt-3 w-full rounded-xl bg-fusion-red py-2.5 text-sm font-semibold text-white"
                    >
                      Add to Cart
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </main>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
