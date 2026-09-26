"use client";

import Link from "next/link";
import { MealSearch } from "@/components/canteen/MealSearch";
import { CanteenShopLayout } from "@/ptero/components/CanteenShopLayout";
import { CAMPUS } from "@/ptero/config/campus";
import { getCollege } from "@/ptero/config/canteen/colleges";
import { RESTAURANTS } from "@/ptero/config/canteen/restaurants";

export default function CanteenIndexPage() {
  const sidebar = (
    <nav className="px-2 py-2">
      <Link
        href="/cityu/taste"
        className="mb-1 block rounded-lg px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50"
      >
        ← {CAMPUS.supermarket} supermarket
      </Link>
      {RESTAURANTS.map((r) =>
        r.menuReady ? (
          <Link
            key={r.id}
            href={`/cityu/canteen/${r.id}`}
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
    <CanteenShopLayout
      searchSlot={<MealSearch campus="cityu" />}
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
        {RESTAURANTS.map((r) => {
          const college = r.collegeId ? getCollege(r.collegeId) : undefined;
          const body = (
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                {r.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.logo}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded-xl object-contain bg-white ring-1 ring-gray-100"
                  />
                ) : null}
                <div className="min-w-0">
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
              </div>
              <span
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  r.menuReady
                    ? "bg-[#ED1C24] text-white"
                    : "border border-gray-200 bg-gray-100 text-gray-500"
                }`}
              >
                {r.menuReady ? "Menu" : "Soon"}
              </span>
            </div>
          );
          if (!r.menuReady) {
            return (
              <div
                key={r.id}
                aria-disabled="true"
                className="block rounded-2xl border border-gray-100 bg-white p-4 opacity-95 shadow-sm"
              >
                {body}
              </div>
            );
          }
          return (
            <Link
              key={r.id}
              href={`/cityu/canteen/${r.id}`}
              className="block rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-[#ED1C24]/40 hover:shadow-md"
            >
              {body}
            </Link>
          );
        })}
      </div>
    </CanteenShopLayout>
  );
}
