"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { FelixOrderCard } from "@/components/FelixOrderCard";
import { RequireAuth } from "@/components/RequireAuth";
import { SECTION_META } from "@/data/aisles";
import { useUser } from "@/context/UserContext";
import {
  ESTIMATED_DELIVERY_MINUTES,
  formatEta,
  getEstimatedDeliveryTime,
} from "@/lib/constants";
import { fetchLiveDeliveryCount } from "@/lib/orders";

export default function HomePage() {
  const { user } = useUser();
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const eta = getEstimatedDeliveryTime();

  useEffect(() => {
    void fetchLiveDeliveryCount().then(setLiveCount);
    const interval = setInterval(() => {
      void fetchLiveDeliveryCount().then(setLiveCount);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <RequireAuth>
      <AppShell>
        <div className="min-h-screen bg-gray-50">
          <AppHeader title="Fusion Express" />

          <main className="mx-auto max-w-[480px] px-4 py-6">
            <div className="mb-4 rounded-xl bg-gradient-to-r from-fusion-red to-[#c91820] px-4 py-3 text-white shadow-sm">
              <p className="text-xs text-red-100">Estimated delivery</p>
              <p className="text-lg font-bold">
                ~{ESTIMATED_DELIVERY_MINUTES} min · by {formatEta(eta)}
              </p>
              {liveCount != null && liveCount > 0 && (
                <p className="mt-1 text-xs text-red-100">
                  🚴 {liveCount} order{liveCount === 1 ? "" : "s"} being delivered now
                </p>
              )}
            </div>

            <FelixOrderCard />

            <div className="mb-6">
              <p className="text-sm text-gray-500">Welcome back,</p>
              <h1 className="text-xl font-bold text-gray-900">{user?.fullName}</h1>
              <p className="mt-1 text-xs text-gray-400">
                {user?.college} · {user?.hall}
                {user?.roomNumber ? ` · ${user.roomNumber}` : ""}
              </p>
            </div>

            <p className="mb-4 text-sm font-medium text-gray-700">
              Where would you like to shop?
            </p>

            <div className="space-y-4">
              {(["refrigerated", "dry"] as const).map((section) => {
                const meta = SECTION_META[section];
                return (
                  <Link
                    key={section}
                    href={`/browse/${section}`}
                    className="block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition-transform active:scale-[0.98]"
                  >
                    <div
                      className={`flex items-center gap-4 p-6 ${
                        section === "refrigerated"
                          ? "bg-gradient-to-r from-sky-50 to-white"
                          : "bg-gradient-to-r from-amber-50 to-white"
                      }`}
                    >
                      <span className="text-5xl">{meta.emoji}</span>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">
                          {meta.title}
                        </h2>
                        <p className="mt-0.5 text-sm text-gray-500">{meta.subtitle}</p>
                        <span className="mt-2 inline-block text-sm font-semibold text-fusion-red">
                          Browse →
                        </span>
                      </div>
                    </div>
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
