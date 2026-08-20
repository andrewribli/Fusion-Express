"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import {
  getAislesForSection,
  isValidSection,
  SECTION_META,
  type StoreSection,
} from "@/data/aisles";
import {
  getAisleItems,
  getStaticMenuItems,
} from "@/lib/menu";

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
        <div className="min-h-screen bg-gray-50">
        <AppHeader
          showBack
          backHref="/menu"
          title={meta.title}
        />

        <main className="mx-auto max-w-[480px] px-4 py-4">
          <p className="mb-4 text-sm text-gray-500">{meta.subtitle}</p>

          <div className="grid grid-cols-2 gap-3">
            {aisles.map((aisle) => {
              const count = getAisleItems(allItems, section, aisle.id).length;
              return (
                <Link
                  key={aisle.id}
                  href={`/browse/${section}/${aisle.id}`}
                  className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm transition-transform active:scale-[0.97]"
                >
                  <span className="text-3xl">{aisle.emoji}</span>
                  <p className="mt-2 text-sm font-semibold leading-snug text-gray-900">
                    {aisle.label}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {count > 0 ? `${count} items` : "Coming soon"}
                  </p>
                </Link>
              );
            })}
          </div>
        </main>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
