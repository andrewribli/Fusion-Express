"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { AislePhotoButton } from "@/components/AislePhotoButton";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { RequireAuth } from "@/components/RequireAuth";
import { useUser } from "@/context/UserContext";

export function HomeLanding() {
  const { user } = useUser();

  return (
    <RequireAuth>
      <AppShell>
        <div
          className="relative min-h-screen"
          style={
            {
              "--fusion-red": "#ed1c24",
              "--background": "#f9fafb",
            } as CSSProperties
          }
        >
          <div className="absolute inset-0">
            <Image
              src="/images/home-hero.png"
              alt="Fusion supermarket produce section"
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/75" />
          </div>

          <div className="relative z-10">
            <AppHeader title="Fusion Express" />

            <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-16">
              <h1 className="text-center text-4xl font-bold tracking-tight text-white drop-shadow-md md:text-5xl">
                Fusion Express
              </h1>
              <p className="mt-3 text-center text-lg font-medium text-white/95 drop-shadow md:text-xl">
                Shop better &amp; make cash from exercising
              </p>
              {user?.fullName && (
                <p className="mt-2 text-center text-sm text-white/80">
                  Hi, {user.fullName}
                </p>
              )}

              <div className="mt-8 grid grid-cols-2 gap-3 md:gap-5">
                <AislePhotoButton
                  href="/browse/dry"
                  imageSrc="/images/aisle-dry.png"
                  imageAlt="Dry goods aisle"
                  title="Non-Refrigerated"
                  subtitle="Pantry & dry goods"
                  sideLabel="Left aisle"
                />
                <AislePhotoButton
                  href="/browse/refrigerated"
                  imageSrc="/images/aisle-refrigerated.png"
                  imageAlt="Refrigerated meat counter"
                  title="Refrigerated"
                  subtitle="Chilled & frozen"
                  sideLabel="Right aisle"
                />
              </div>

              <Link
                href="/runner"
                className="mt-4 flex items-center justify-center rounded-2xl bg-white/95 px-5 py-4 text-center shadow-md transition-transform active:scale-[0.98]"
              >
                <span>
                  <span className="block text-lg font-bold text-gray-900">
                    Pick Up an Order
                  </span>
                  <span className="mt-0.5 block text-sm text-gray-600">
                    {user?.isRunner
                      ? "See available deliveries"
                      : "One-time registration, then take deliveries"}
                  </span>
                </span>
              </Link>

              <Link
                href="/menu"
                className="mt-3 block text-center text-sm font-medium text-white/90 underline underline-offset-2"
              >
                Popular requests &amp; custom items
              </Link>

              <div className="mt-6 rounded-xl bg-white/90 p-3">
                <PriceDisclaimer />
              </div>
            </main>
          </div>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
