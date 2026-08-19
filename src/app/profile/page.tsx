"use client";

import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useUser } from "@/context/UserContext";

export default function ProfilePage() {
  const { user, logout } = useUser();

  return (
    <RequireAuth>
      <AppShell>
        <div className="min-h-screen bg-gray-50">
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
                href="/runner/terms"
                className="mt-4 block rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm"
              >
                <p className="font-semibold text-fusion-red">Become a Runner</p>
                <p className="mt-1 text-xs text-gray-500">
                  Earn ${7} per delivery
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
              className="mt-6 w-full rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700"
            >
              Log Out
            </button>
          </main>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
