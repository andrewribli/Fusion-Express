"use client";

import Image from "next/image";
import Link from "next/link";
import { ShopLayout } from "@/components/ShopLayout";
import { MealSearch } from "@/components/canteen/MealSearch";
import { RESTAURANTS } from "@/data/canteen/restaurants";
import { computeDeliveryFee, formatHkdAmount } from "@fusion-express/shared/delivery-pricing";

export default function CanteenIndexPage() {
  const canteenBase = formatHkdAmount(
    computeDeliveryFee({ campus: "cuhk", sourceId: "sorazen" }).base,
  );
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
      searchSlot={<MealSearch campus="cuhk" />}
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
          Your canteen favorites, delivered to your dorm lobby. Delivery depends
          on the canteen and your hall (from HK${canteenBase}, or HK$0 in the
          same building). At UC Canteen you save HK$2 when a United College runner accepts.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {RESTAURANTS.map((r) => {
          const card = (
            <article
              className={`group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition ${
                r.menuReady
                  ? "hover:border-[#ED1C24]/40 hover:shadow-md"
                  : "opacity-90"
              }`}
            >
              <div className="relative flex h-[120px] w-full items-center justify-center overflow-hidden bg-[#f7f6f4] lg:aspect-[4/3] lg:h-auto">
                <Image
                  src={r.coverImage}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-contain p-3"
                />
                {!r.menuReady ? (
                  <span className="absolute right-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Soon
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-3">
                <h2 className="line-clamp-2 min-w-0 text-base font-bold leading-snug text-gray-900">
                  {r.shortName}
                </h2>
                <span
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold ${
                    r.menuReady
                      ? "bg-[#ED1C24] text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {r.menuReady ? "Menu" : "Soon"}
                </span>
              </div>
            </article>
          );

          if (!r.menuReady) {
            return (
              <div key={r.id} aria-disabled="true">
                {card}
              </div>
            );
          }
          return (
            <Link key={r.id} href={`/canteen/${r.id}`} className="block">
              {card}
            </Link>
          );
        })}
      </div>
    </ShopLayout>
  );
}
