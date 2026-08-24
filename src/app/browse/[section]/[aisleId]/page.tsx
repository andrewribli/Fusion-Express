"use client";

import { use, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { ItemListRow } from "@/components/ItemListRow";
import { ManualItemForm } from "@/components/ManualItemForm";
import { MenuSearch } from "@/components/MenuSearch";
import { OrderActionBar } from "@/components/OrderActionBar";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAuth } from "@/components/RequireAuth";
import { getAisle, isValidSection, type StoreSection } from "@/data/aisles";
import {
  getAisleItems,
  getStaticMenuItems,
  searchItems,
} from "@/lib/menu";

export default function AisleItemsPage({
  params,
}: {
  params: Promise<{ section: string; aisleId: string }>;
}) {
  const { section: sectionParam, aisleId } = use(params);
  const [search, setSearch] = useState("");

  if (!isValidSection(sectionParam)) notFound();

  const section = sectionParam as StoreSection;
  const aisle = getAisle(section, aisleId);
  if (!aisle) notFound();

  const aisleItems = useMemo(
    () => getAisleItems(getStaticMenuItems(), section, aisleId),
    [section, aisleId],
  );

  const items = useMemo(
    () => searchItems(aisleItems, search),
    [aisleItems, search],
  );

  return (
    <RequireAuth>
      <AppShell>
        <LakersWallpaper>
          <AppHeader
            showBack
            backHref={`/browse/${section}`}
            title={aisle.label}
          />

          <main className="mx-auto w-full max-w-7xl px-4 py-4 pb-36 md:px-6">
            <div className="mb-4">
              <MenuSearch
                items={aisleItems}
                value={search}
                onChange={setSearch}
              />
            </div>
            <ManualItemForm className="mb-4" />

            {items.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white/90 px-6 py-12 text-center shadow-sm">
                <p className="text-sm text-gray-600">
                  {search
                    ? "No items match your search."
                    : "No items in this aisle yet. Check back soon!"}
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {items.map((item) => (
                  <ItemListRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </main>
          <OrderActionBar />
        </LakersWallpaper>
      </AppShell>
    </RequireAuth>
  );
}
