"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { PaymentStatusCard } from "@/components/PaymentStatusCard";
import { RequireAuth } from "@/components/RequireAuth";
import { useUser } from "@/context/UserContext";
import { fetchOrdersByIds, getOrderHistoryIds } from "@/lib/orders";
import { isPaymentOutstanding } from "@/lib/payments";
import type { Order } from "@/lib/types";

export default function ProfilePage() {
  const { user, logout } = useUser();
  const [outstanding, setOutstanding] = useState<Order[]>([]);

  const loadOutstanding = useCallback(async () => {
    const orders = await fetchOrdersByIds(getOrderHistoryIds());
    setOutstanding(orders.filter((o) => isPaymentOutstanding(o)));
  }, []);

  useEffect(() => {
    void loadOutstanding();
  }, [loadOutstanding]);

  return (
    <RequireAuth>
      <AppShell>
        <LakersWallpaper>
          <AppHeader title="Profile" />

          <main className="mx-auto max-w-[480px] px-4 py-6">
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-500">Account</h2>
              <p className="mt-2 text-lg font-bold text-gray-900">{user?.fullName}</p>
              <p className="text-sm text-gray-600">{user?.chineseName}</p>
              <p className="mt-2 text-sm text-gray-600">SID: {user?.studentId}</p>
              {user?.username && (
                <p className="text-sm text-gray-600">@{user.username}</p>
              )}
              {user?.phone && (
                <p className="text-sm text-gray-600">Phone: {user.phone}</p>
              )}
            </section>

            {outstanding.length > 0 && (
              <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-amber-900">
                  Outstanding Payments
                </h2>
                <p className="mt-1 text-xs text-amber-800">
                  These delivered orders still need to be paid to GraceRun.
                </p>
                <ul className="mt-3 space-y-3">
                  {outstanding.map((order) => (
                    <li
                      key={order.id}
                      className="rounded-xl border border-amber-100 bg-white p-3"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/track?orderId=${order.id}`}
                          className="text-sm font-bold text-gray-900"
                        >
                          {order.id}
                        </Link>
                      </div>
                      <div className="mt-2">
                        <PaymentStatusCard
                          order={order}
                          compact
                          onPaid={loadOutstanding}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-500">Delivery Address</h2>
              <p className="mt-2 text-sm text-gray-800">{user?.college}</p>
              <p className="text-sm text-gray-800">{user?.hall}</p>
              {user?.roomNumber && (
                <p className="text-sm text-gray-800">Room {user.roomNumber}</p>
              )}
            </section>

            {user?.isRunner && (
              <section className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-5">
                <h2 className="text-sm font-semibold text-fusion-red">Runner Profile</h2>
                <p className="mt-2 text-sm text-gray-700">
                  Registered runner · Payout via {user.runnerPaymentMethod}
                </p>
                <Link
                  href="/runner/dashboard"
                  className="mt-3 inline-block text-sm font-semibold text-fusion-red underline"
                >
                  Open Runner Dashboard →
                </Link>
              </section>
            )}

            {!user?.isRunner && (
              <Link
                href="/runner"
                className="mt-4 block rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm"
              >
                <p className="font-semibold text-fusion-red">Pick up an order</p>
                <p className="mt-1 text-xs text-gray-500">
                  Earn $7 per delivery after a one-time registration
                </p>
              </Link>
            )}

            <Link
              href="/track"
              className="mt-4 block rounded-2xl border border-gray-100 bg-white p-4 text-center text-sm font-medium text-gray-700 shadow-sm"
            >
              Track an Order
            </Link>

            <button
              type="button"
              onClick={async () => {
                await logout();
                window.location.href = "/";
              }}
              className="mt-6 w-full rounded-xl border border-gray-300 bg-white/90 py-3 text-sm font-semibold text-gray-700"
            >
              Log out / Sign out
            </button>
          </main>
        </LakersWallpaper>
      </AppShell>
    </RequireAuth>
  );
}
