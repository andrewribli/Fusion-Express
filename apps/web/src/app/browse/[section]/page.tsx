"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { AislePhotoButton } from "@/components/AislePhotoButton";
import { BrowseBreadcrumb } from "@/components/BrowseBreadcrumb";
import { CategoryTabs } from "@/components/CategoryTabs";
import { ProductSearchPanel } from "@/components/ProductSearchPanel";
import { OrderActionBar } from "@/components/OrderActionBar";
import { getAisleImage } from "@/data/aisle-images";
import {
  getAislesForSection,
  isValidSection,
  SECTION_META,
  type StoreSection,
} from "@/data/aisles";
import { loadAllProducts } from "@/lib/firestore";
import { getAisleItems, getSectionItems } from "@/lib/menu";
import { popularCapForAisle } from "@/lib/popular-items";
import type { MenuItem } from "@/lib/types";

export default function BrowseSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: sectionParam } = use(params);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadAllProducts().then((items) => {
      if (!cancelled) setAllItems(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isValidSection(sectionParam)) notFound();

  const section = sectionParam as StoreSection;
  const meta = SECTION_META[section];
  const aisles = getAislesForSection(section);
  const sectionItems = getSectionItems(allItems, section);

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50">
          <AppHeader showBack backHref="/home" title={meta.title} />

          <main className="mx-auto w-full max-w-7xl px-4 py-4 pb-36 md:px-6">
            <BrowseBreadcrumb
              items={[
                { label: "Shop Now", href: "/home" },
                { label: "All categories", href: "/menu" },
                { label: meta.title },
              ]}
            />

            <h1 className="text-xl font-bold text-gray-900">{meta.title}</h1>
            <p className="mt-1 mb-4 text-sm text-gray-500">{meta.subtitle}</p>

            <CategoryTabs section={section} aisles={aisles} />

            <ProductSearchPanel
              items={sectionItems}
              label="Search"
              placeholder={
                section === "dry"
                  ? "Search groceries…"
                  : "Search fresh food…"
              }
              className="mt-4 mb-6"
            />

            <h2 className="mb-3 text-sm font-bold text-gray-900">Categories</h2>
            {aisles.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
                No {meta.title.toLowerCase()} categories in the catalog yet.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {aisles.map((aisle) => {
                const count = getAisleItems(allItems, section, aisle.id).length;
                const cap = popularCapForAisle(aisle.id);
                const subtitle =
                  count > cap
                    ? `${cap} popular · search for more`
                    : count > 0
                      ? `${count} items`
                      : "Coming soon";
                return (
                  <AislePhotoButton
                    key={aisle.id}
                    href={`/browse/${section}/${aisle.id}`}
                    imageSrc={getAisleImage(aisle.id)}
                    imageAlt={aisle.label}
                    title={aisle.label}
                    subtitle={subtitle}
                    compact
                  />
                );
              })}
            </div>
          </main>
          <OrderActionBar />
        </div>
    </AppShell>
  );
}
