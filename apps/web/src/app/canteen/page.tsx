"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShopLayout } from "@/components/ShopLayout";
import { getCollege } from "@/data/canteen/colleges";
import { RESTAURANTS } from "@/data/canteen/restaurants";
import type { MenuItem } from "@/lib/types";

export default function CanteenIndexPage() {
  const [search, setSearch] = useState("");

  const searchProducts = useMemo<MenuItem[]>(
    () =>
      RESTAURANTS.filter((r) => r.menuReady).map((r) => ({
        id: `canteen-nav:${r.id}`,
        name: r.name,
        category: "other",
        price: r.deliveryFee,
        unit: "each",
        priceType: "fixed",
        runnerInputsPrice: false,
        inStock: true,
        sortOrder: 0,
        weightKg: 0,
      })),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return RESTAURANTS;
    return RESTAURANTS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.shortName.toLowerCase().includes(q) ||
        r.blurb.toLowerCase().includes(q),
    );
  }, [search]);

  const sidebar = (
    <nav className="px-2 py-2">
      {RESTAURANTS.map((r) =>
        r.menuReady ? (
          <Link
            key={r.id}
            href={`/canteen/${r.id}`}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            {r.shortName}
          </Link>
        ) : (
          <div
            key={r.id}
            aria-disabled="true"
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400"
          >
            {r.shortName}
            <span className="ml-2 text-[10px] font-semibold uppercase text-gray-400">
              Soon
            </span>
          </div>
        ),
      )}
    </nav>
  );

  return (
    <ShopLayout
      deliveryLabel="Deliver to CUHK hall lobby · Canteen"
      searchProducts={searchProducts}
      search={search}
      onSearchChange={setSearch}
      onSearchSelect={(item) => {
        const id = item.id.replace(/^canteen-nav:/, "");
        if (id) window.location.href = `/canteen/${id}`;
      }}
      searchPlaceholder="Search canteens"
      sidebar={sidebar}
      mobileSidebarTitle="Canteens"
      cartChannel="canteen"
    >
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ED1C24]">
          CUHK canteens
        </p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">
          GraceRun Canteen
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
          Your canteen favorites, delivered to your dorm lobby. Flat delivery
          HK$10 · 10% college canteen discount when your runner matches.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((r) => {
          const college = r.collegeId ? getCollege(r.collegeId) : undefined;
          const className = `flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition ${
            r.menuReady
              ? "hover:border-[#ED1C24]/40 hover:shadow-md"
              : "opacity-95"
          }`;
          const body = (
            <>
              <div className="flex items-start gap-3">
                {r.logoSrc ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-50 ring-1 ring-gray-100">
                    <Image
                      src={r.logoSrc}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-contain p-1"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-bold text-gray-900">{r.name}</p>
                    {college ? (
                      <span className="rounded-md bg-[#ED1C24]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#ED1C24]">
                        {college.shortName} · 10% off
                      </span>
                    ) : null}
                    {!r.menuReady ? (
                      <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
                        Soon
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">{r.blurb}</p>
              {r.location ? (
                <p className="mt-1.5 text-xs text-gray-500">{r.location}</p>
              ) : null}
              <p className="mt-2 text-xs text-gray-500">
                {r.hoursLabel} · HK${r.deliveryFee} delivery
              </p>
              <div className="mt-4 flex justify-end">
                <span
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    r.menuReady
                      ? "bg-[#ED1C24] text-white"
                      : "border border-gray-200 bg-gray-100 text-gray-500"
                  }`}
                >
                  {r.menuReady ? "Menu" : "Soon"}
                </span>
              </div>
            </>
          );
          if (!r.menuReady) {
            return (
              <div key={r.id} aria-disabled="true" className={className}>
                {body}
              </div>
            );
          }
          return (
            <Link key={r.id} href={`/canteen/${r.id}`} className={className}>
              {body}
            </Link>
          );
        })}
      </div>
    </ShopLayout>
  );
}
