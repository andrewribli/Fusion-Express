"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { AislePhotoButton } from "@/components/AislePhotoButton";
import { OrderActionBar } from "@/components/OrderActionBar";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAuth } from "@/components/RequireAuth";
import { getAisleImage } from "@/data/aisle-images";
import {
  getAislesForSection,
  isValidSection,
  SECTION_META,
  type StoreSection,
} from "@/data/aisles";
import { getAisleItems, getStaticMenuItems } from "@/lib/menu";

export default function BrowseSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: sectionParam } = use(params);

  if (!isValidSection(sectionParam)) notFound();

  const section = sectionParam as StoreSection;
  const meta = SECTION_META[section];
  const aisles = getAislesForSection(section);
  const allItems = getStaticMenuItems();

  return (
    <RequireAuth>
      <AppShell>
        <LakersWallpaper>
          <AppHeader showBack backHref="/home" title={meta.title} />

          <main className="mx-auto w-full max-w-7xl px-4 py-4 pb-36 md:px-6">
            <p className="mb-4 text-sm text-lakers-gold">{meta.subtitle}</p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {aisles.map((aisle) => {
                const count = getAisleItems(allItems, section, aisle.id).length;
                return (
                  <AislePhotoButton
                    key={aisle.id}
                    href={`/browse/${section}/${aisle.id}`}
                    imageSrc={getAisleImage(aisle.id)}
                    imageAlt={aisle.label}
                    title={aisle.label}
                    subtitle={count > 0 ? `${count} items` : "Coming soon"}
                    compact
                  />
                );
              })}
            </div>
          </main>
          <OrderActionBar />
        </LakersWallpaper>
      </AppShell>
    </RequireAuth>
  );
}
