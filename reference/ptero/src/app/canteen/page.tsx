"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CanteenShopLayout } from "@/components/CanteenShopLayout";
import { CAMPUS } from "@/config/campus";
import { getCollege } from "@/config/canteen/colleges";
import { RESTAURANTS } from "@/config/canteen/restaurants";

export default function CanteenIndexPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return RESTAURANTS;
    return RESTAURANTS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.shortName.toLowerCase().includes(q) ||
        r.blurb.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q),
    );
  }, [search]);

  const sidebar = (
    <nav className="px-2 py-2">
      <Link
        href="/taste"
        className="mb-1 block rounded-lg px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50"
      >
        ← {CAMPUS.supermarket} supermarket
      </Link>
      {RESTAURANTS.map((r) => (
        <Link
          key={r.id}
          href={`/canteen/${r.id}`}
          className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          {r.shortName}
          {!r.menuReady ? (
            <span className="ml-2 text-[10px] font-semibold uppercase text-gray-400">
              Soon
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );

  return (
    <CanteenShopLayout
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search canteens"
      sidebar={sidebar}
      mobileSidebarTitle="CityU Canteens"
    >
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ED1C24]">
          CityU canteens
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">
          {CAMPUS.brandName} Canteen
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
          Campus favourites delivered to your dorm lobby. Flat delivery HK$10 ·
          10% residence discount when your runner matches (e.g. MOS runner → MOS
          Hall Canteen).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((r) => {
          const college = r.collegeId ? getCollege(r.collegeId) : undefined;
          return (
            <Link
              key={r.id}
              href={`/canteen/${r.id}`}
              className="block rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-[#ED1C24]/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-bold text-gray-900">{r.name}</p>
                    {college ? (
                      <span className="rounded-md bg-[#ED1C24]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#ED1C24]">
                        {college.shortName} · 10% off
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    {r.blurb}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {r.cuisine} · {r.location}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {r.hoursLabel} · HK${r.deliveryFee} delivery
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-[#ED1C24] px-3 py-1.5 text-xs font-semibold text-white">
                  Menu
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </CanteenShopLayout>
  );
}
