"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { RequireAuth } from "@/components/RequireAuth";
import { useCart } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import {
  ESTIMATED_DELIVERY_MINUTES,
  formatEta,
  getEstimatedDeliveryTime,
} from "@/lib/constants";

const ACTIONS = [
  {
    href: "/track",
    emoji: "🧺",
    title: "Pick Up an Order",
    subtitle: "Track a delivery already on the way",
    tint: "from-orange-50 to-white",
  },
  {
    href: "/menu",
    emoji: "🛍️",
    title: "Make an Order",
    subtitle: "Browse the supermarket aisles",
    tint: "from-red-50 to-white",
  },
] as const;

export function HomeLanding() {
  const router = useRouter();
  const { user } = useUser();
  const { itemCount } = useCart();
  const eta = getEstimatedDeliveryTime();

  function continueShopping() {
    router.push(itemCount > 0 ? "/cart" : "/menu");
  }

  return (
    <RequireAuth>
      <AppShell>
        <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50/40 to-white">
          <AppHeader title="Fusion Express" />

          <main className="mx-auto max-w-[480px] px-4 py-6">
            <div className="mb-5 text-center">
              <p className="text-4xl" aria-hidden>
                🍎🛒🛍️
              </p>
              <h1 className="mt-3 text-2xl font-bold text-gray-900">
                Welcome to Fusion Express
              </h1>
              {user?.fullName && (
                <p className="mt-1 text-sm text-gray-500">Hi, {user.fullName}</p>
              )}
              <p className="mt-2 text-sm text-gray-600">
                CUHK dorm grocery run · ~{ESTIMATED_DELIVERY_MINUTES} min · by{" "}
                {formatEta(eta)}
              </p>
            </div>

            <PriceDisclaimer className="mb-4" />

            <div className="grid grid-cols-1 gap-3">
              {ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`flex items-center gap-4 rounded-2xl border border-orange-100 bg-gradient-to-r ${action.tint} p-5 shadow-sm transition-transform active:scale-[0.98]`}
                >
                  <span className="text-4xl">{action.emoji}</span>
                  <div className="min-w-0 text-left">
                    <p className="text-base font-bold text-gray-900">
                      {action.title}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-500">{action.subtitle}</p>
                    <span className="mt-2 inline-block text-sm font-semibold text-fusion-red">
                      Go →
                    </span>
                  </div>
                </Link>
              ))}

              <button
                type="button"
                onClick={continueShopping}
                className="flex items-center gap-4 rounded-2xl border border-orange-100 bg-gradient-to-r from-yellow-50 to-white p-5 text-left shadow-sm transition-transform active:scale-[0.98]"
              >
                <span className="text-4xl">🛒</span>
                <div className="min-w-0">
                  <p className="text-base font-bold text-gray-900">
                    Continue Where You Left Off
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {itemCount > 0
                      ? `${itemCount} item${itemCount === 1 ? "" : "s"} waiting in your cart`
                      : "No saved cart yet — start a new order"}
                  </p>
                  <span className="mt-2 inline-block text-sm font-semibold text-fusion-red">
                    Resume →
                  </span>
                </div>
              </button>
            </div>
          </main>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
