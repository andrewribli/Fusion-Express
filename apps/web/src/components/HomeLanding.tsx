"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { AislePhotoButton } from "@/components/AislePhotoButton";
import { CustomItemCard } from "@/components/CustomItemCard";
import { ProductSearchPanel } from "@/components/ProductSearchPanel";
import { QuickCategoryTabs } from "@/components/QuickCategoryTabs";
import { useUser } from "@/context/UserContext";

function firstName(fullName?: string): string | undefined {
  return fullName?.trim().split(/\s+/)[0];
}

export function HomeLanding() {
  const { user } = useUser();
  const name = firstName(user?.fullName);

  useEffect(() => {
    document.title = "Shop Now — GraceRun";
  }, []);

  return (
    <AppShell>
      <div className="min-h-screen bg-gray-50">
          <AppHeader />

          <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-4 md:px-6">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-8">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {name ? `Hi ${name}, what do you need?` : "Groceries from Fusion to your hall lobby"}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {name
                    ? "Groceries from Fusion, delivered to your hall lobby."
                    : "Browse prices now. Sign in with your CUHK email when you are ready to order."}
                </p>

                <ProductSearchPanel
                  className="mt-4"
                  placeholder="Search for noodles, drinks, snacks…"
                />

                <div className="mt-4 lg:hidden">
                  <CustomItemCard />
                </div>

                <section className="mt-6">
                  <h2 className="text-sm font-bold text-gray-900">Categories</h2>
                  <QuickCategoryTabs className="mt-3" />
                </section>

                <section className="mt-4">
                  <h2 className="text-sm font-bold text-gray-900">Shop by aisle</h2>
                  <div className="mt-3 grid grid-cols-2 gap-3 md:gap-5">
                    <AislePhotoButton
                      href="/browse/dry"
                      imageSrc="/images/aisle-dry.png"
                      imageAlt="Groceries aisle"
                      title="Groceries"
                      subtitle="Pantry & shelf-stable"
                      sideLabel="Left aisle"
                    />
                    <AislePhotoButton
                      href="/browse/refrigerated"
                      imageSrc="/images/aisle-refrigerated.png"
                      imageAlt="Fresh food counter"
                      title="Fresh Food"
                      subtitle="Chilled & refrigerated"
                      sideLabel="Right aisle"
                    />
                  </div>
                </section>

                <Link
                  href="/menu"
                  className="mt-4 block rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm"
                >
                  Browse the full store
                  <span className="mt-0.5 block text-xs font-normal text-gray-500">
                    Popular requests and every aisle in one page
                  </span>
                </Link>

              </div>

              <aside className="hidden lg:sticky lg:top-20 lg:block">
                <CustomItemCard />
              </aside>
            </div>
          </main>
        </div>
    </AppShell>
  );
}
