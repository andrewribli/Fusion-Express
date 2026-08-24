"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { AislePhotoButton } from "@/components/AislePhotoButton";
import { FelixOrderCard } from "@/components/FelixOrderCard";
import { OrderActionBar } from "@/components/OrderActionBar";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAuth } from "@/components/RequireAuth";
import { SECTION_META } from "@/data/aisles";
import { useCart } from "@/context/CartContext";
import { RUNNER_JUDGMENT_NOTE } from "@/lib/constants";
import { createCustomMenuItem } from "@/lib/custom-item";
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
  const [manualName, setManualName] = useState("");
  const featured = FEATURED_IDS.map((id) => getMenuItemById(id)).filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );

  function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = manualName.trim();
    if (!name) return;
    addItem(createCustomMenuItem(name));
    setManualName("");
  }

  const dry = SECTION_META.dry;
  const cold = SECTION_META.refrigerated;

  return (
    <RequireAuth>
      <AppShell>
        <LakersWallpaper>
          <AppHeader showBack backHref="/home" title="Create an Order" />

          <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-36 md:px-6">
            <h1 className="text-xl font-bold text-lakers-gold">Shop Fusion</h1>
            <p className="mt-1 text-sm text-white/80">
              Dry goods on the left · fridge on the right
            </p>

            <PriceDisclaimer className="mt-3" />

            <div className="mt-4 grid grid-cols-2 gap-3 md:gap-6">
              <AislePhotoButton
                href="/browse/dry"
                imageSrc="/images/aisle-dry.png"
                imageAlt="Dry goods aisle"
                title="Non-Refrigerated"
                subtitle={dry.subtitle}
                sideLabel="Left aisle"
              />
              <AislePhotoButton
                href="/browse/refrigerated"
                imageSrc="/images/aisle-refrigerated.png"
                imageAlt="Refrigerated meat counter"
                title="Refrigerated"
                subtitle={cold.subtitle}
                sideLabel="Right aisle"
              />
            </div>

            <form
              onSubmit={handleManualAdd}
              className="mt-4 rounded-2xl border border-dashed border-orange-300 bg-white p-4 shadow-sm"
            >
              <label
                htmlFor="manual-item"
                className="block text-sm font-semibold text-gray-900"
              >
                Did we miss something? Add your item manually:
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="manual-item"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. 1 biggest Pocari Sweat"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-fusion-red focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!manualName.trim()}
                  className="rounded-xl bg-fusion-red px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">{RUNNER_JUDGMENT_NOTE}</p>
            </form>

            <div className="mt-6">
              <FelixOrderCard />
            </div>

            <section className="mt-6">
              <h2 className="text-sm font-bold text-lakers-gold">Popular requests</h2>
              <p className="mt-1 text-xs text-white/70">{RUNNER_JUDGMENT_NOTE}</p>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {featured.map((item) => (
                  <li
                    key={item.id}
                    className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
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
                      className="mt-auto w-full rounded-xl bg-fusion-red py-2.5 text-sm font-semibold text-white"
                    >
                      Add to Cart
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </main>
          <OrderActionBar />
        </LakersWallpaper>
      </AppShell>
    </RequireAuth>
  );
}
