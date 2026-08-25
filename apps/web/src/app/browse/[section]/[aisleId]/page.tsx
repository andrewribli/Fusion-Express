"use client";

import { use, useEffect, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { ItemListRow } from "@/components/ItemListRow";
import { ManualItemForm } from "@/components/ManualItemForm";
import { MenuSearch } from "@/components/MenuSearch";
import { OrderActionBar } from "@/components/OrderActionBar";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAuth } from "@/components/RequireAuth";
import { getAisle, isValidSection, type StoreSection } from "@/data/aisles";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { productBelongsToAisle } from "@/lib/firestore";
import { firestoreProductToMenuItem } from "@/lib/firestore-products";
import { searchItems } from "@/lib/menu";
import type { MenuItem } from "@/lib/types";

export default function AisleItemsPage({
  params,
}: {
  params: Promise<{ section: string; aisleId: string }>;
}) {
  const { section: sectionParam, aisleId } = use(params);
  const [search, setSearch] = useState("");
  const [aisleItems, setAisleItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const section = isValidSection(sectionParam)
    ? (sectionParam as StoreSection)
    : undefined;
  const aisle = section ? getAisle(section, aisleId) : undefined;

  useEffect(() => {
    if (!section || !aisle) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        if (!isFirebaseConfigured()) {
          throw new Error("Firebase is not configured in this environment.");
        }

        const snap = await getDocs(collection(getDb(), "products"));
        const all = snap.docs.map((doc) =>
          firestoreProductToMenuItem(
            doc.id,
            doc.data() as Record<string, unknown>,
          ),
        );
        const filtered = all.filter((item) =>
          productBelongsToAisle(item, aisleId, section),
        );

        if (!cancelled) setAisleItems(filtered);
      } catch (err) {
        if (!cancelled) {
          setAisleItems([]);
          setError(
            err instanceof Error ? err.message : "Could not load products.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [section, aisleId, aisle]);

  const items = useMemo(
    () => searchItems(aisleItems, search),
    [aisleItems, search],
  );

  if (!section || !aisle) notFound();

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

            {loading ? (
              <div className="rounded-2xl border border-gray-100 bg-white/90 px-6 py-12 text-center shadow-sm">
                <p className="text-sm text-gray-600">Loading products…</p>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-gray-100 bg-white/90 px-6 py-12 text-center shadow-sm">
                <p className="text-sm text-gray-600">Could not load products.</p>
                <p className="mt-1 text-xs text-gray-400">{error}</p>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white/90 px-6 py-12 text-center shadow-sm">
                <p className="text-sm text-gray-600">
                  {search
                    ? "No items match your search."
                    : "No items found in this aisle yet."}
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
