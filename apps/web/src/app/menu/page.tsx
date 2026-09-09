"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { AislePhotoButton } from "@/components/AislePhotoButton";
import { FelixOrderCard } from "@/components/FelixOrderCard";
import { MenuCartSummary } from "@/components/MenuCartSummary";
import { MenuGrid } from "@/components/MenuGrid";
import { OrderActionBar } from "@/components/OrderActionBar";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { SECTION_META } from "@/data/aisles";
import { getItemImage } from "@/data/aisle-images";
import { useCart } from "@/context/CartContext";
import { RUNNER_JUDGMENT_NOTE } from "@/lib/constants";
import { loadAllProducts } from "@/lib/firestore";
import {
  groupProductsByCategory,
  splitProductsBySection,
} from "@/lib/firestore-products";
import { getMenuItemById, searchItems } from "@/lib/menu";
import { POPULAR_PER_CATEGORY, topPopularItems } from "@/lib/popular-items";
import { formatMenuPrice, type MenuItem } from "@/lib/types";
import { MenuSearch } from "@/components/MenuSearch";

const FEATURED_IDS = [
  "pocari-sweat-largest",
  "pagoda-kumquat-lemon-bundle",
  "tao-ti-mandarin-lemon",
  "shin-ramen-bowl",
  "fanta-mini-6pack-orange",
] as const;

function ProductCategorySections({
  title,
  items,
  searching,
}: {
  title: string;
  items: MenuItem[];
  searching: boolean;
}) {
  const groups = useMemo(() => {
    return groupProductsByCategory(items).map((group) => ({
      ...group,
      items: searching
        ? group.items
        : topPopularItems(group.items, POPULAR_PER_CATEGORY),
    }));
  }, [items, searching]);

  if (items.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="text-sm font-bold text-lakers-gold">{title}</h2>
      <p className="mt-1 text-xs text-white/70">{RUNNER_JUDGMENT_NOTE}</p>
      <div className="mt-3 space-y-6">
        {groups.map((group) => (
            <div key={group.category}>
              <h3 className="text-sm font-semibold text-white">{group.label}</h3>
              <div className="mt-3">
                <MenuGrid items={group.items} />
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}

export default function MenuPage() {
  const { addItem } = useCart();
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const featured = FEATURED_IDS.map((id) => getMenuItemById(id)).filter(
    (item): item is NonNullable<typeof item> => Boolean(item),
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const items = await loadAllProducts();
        console.log("[menu] loaded", items.length, "products");
        if (!cancelled) setProducts(items);
      } catch (err) {
        console.error("[menu] products query failed", err);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleProducts = useMemo(
    () => searchItems(products, search),
    [products, search],
  );
  const searching = Boolean(search.trim());
  const { dry, refrigerated } = splitProductsBySection(visibleProducts);
  const dryMeta = SECTION_META.dry;
  const coldMeta = SECTION_META.refrigerated;

  return (
    <AppShell>
      <LakersWallpaper>
          <AppHeader showBack backHref="/home" title="Create an Order" />

          <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-36 md:px-6">
            <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start xl:gap-6">
              <div className="min-w-0">
            <h1 className="text-xl font-bold text-lakers-gold">Shop Fusion</h1>
            <p className="mt-1 text-sm text-white/80">
              Dry goods on the left · fridge on the right
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-semibold text-white">
                Search
              </label>
              <MenuSearch
                items={products}
                value={search}
                onChange={setSearch}
                onSelectItem={(item) => {
                  addItem(item);
                  setSearch("");
                }}
                placeholder="Search all products…"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:gap-6">
              <AislePhotoButton
                href="/browse/dry"
                imageSrc="/images/aisle-dry.png"
                imageAlt="Groceries aisle"
                title="Groceries"
                subtitle={dryMeta.subtitle}
                sideLabel="Left aisle"
              />
              <AislePhotoButton
                href="/browse/refrigerated"
                imageSrc="/images/aisle-refrigerated.png"
                imageAlt="Fresh food counter"
                title="Fresh Food"
                subtitle={coldMeta.subtitle}
                sideLabel="Right aisle"
              />
            </div>

            <div className="mt-6">
              <FelixOrderCard />
            </div>

            {productsLoading ? (
              <p className="mt-6 py-8 text-center text-sm text-white/70">
                Loading products…
              </p>
            ) : products.length === 0 ? (
              <p className="mt-6 py-8 text-center text-sm text-white/70">
                No products found.
              </p>
            ) : (
              <>
                <ProductCategorySections
                  title="Groceries"
                  items={dry}
                  searching={searching}
                />
                <ProductCategorySections
                  title="Fresh Food"
                  items={refrigerated}
                  searching={searching}
                />
              </>
            )}

            <section className="mt-6">
              <h2 className="text-sm font-bold text-lakers-gold">Popular requests</h2>
              <p className="mt-1 text-xs text-white/70">{RUNNER_JUDGMENT_NOTE}</p>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {featured.map((item) => (
                  <li
                    key={item.id}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                  >
                    <div className="relative h-24 w-full bg-white">
                      {getItemImage(item) ? (
                        <Image
                          src={getItemImage(item)}
                          alt=""
                          fill
                          className="object-contain p-1"
                          sizes="50vw"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">~{item.weightKg} kg</p>
                    <p className="mt-0.5 text-base font-bold text-fusion-red">
                      {formatMenuPrice(item)}
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
                    </div>
                  </li>
                ))}
              </ul>
            </section>
              </div>
              <div className="hidden xl:sticky xl:top-20 xl:block">
                <MenuCartSummary />
              </div>
            </div>
          </main>
          <OrderActionBar />
        </LakersWallpaper>
    </AppShell>
  );
}
