"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { LegalLink } from "@/components/LegalLink";
import { GuestAccountPrompt } from "@/components/GuestAccountPrompt";
import { ModeSwitchButton } from "@/components/ModeSwitchButton";
import { useUser } from "@/context/UserContext";
import { useActiveCustomerOrders } from "@/lib/use-active-orders";
import { useDemoAuth } from "@/lib/use-demo-auth";
import { roleLabel } from "@/lib/roles";

export function ProfileView() {
  const { user, logout, firebaseEnabled, role, canRunnerMode, canSwitchModes, mode } = useUser();
  const { href: trackHref } = useActiveCustomerOrders();
  const demoAuth = useDemoAuth();
  const [changeOpen, setChangeOpen] = useState(false);
  const canChangePassword = firebaseEnabled && !demoAuth && Boolean(user?.email);
  const isGuest = Boolean(user?.isGuest);

  useEffect(() => {
    if (!canChangePassword) return;
    if (window.location.hash === "#password") setChangeOpen(true);
  }, [canChangePassword]);

  return (
    <>
      <AppShell>
        <LakersWallpaper>
          <AppHeader title="Profile" />

          <main id="account" className="mx-auto max-w-[480px] px-4 py-6">
            {isGuest && (
              <div className="mb-4">
                <GuestAccountPrompt />
              </div>
            )}

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-500">Account</h2>
              <p className="mt-2 text-lg font-bold text-gray-900">{user?.fullName}</p>
              {user?.email && (
                <p className="text-sm text-gray-600">{user.email}</p>
              )}
              {user?.phone && (
                <p className="text-sm text-gray-600">Phone: {user.phone}</p>
              )}
              {canChangePassword && !isGuest && (
                <button
                  type="button"
                  onClick={() => setChangeOpen(true)}
                  className="mt-4 w-full rounded-xl border border-[#ED1C24] bg-white py-3 text-sm font-semibold text-[#ED1C24]"
                >
                  Change Password
                </button>
              )}
            </section>

            <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-500">Account type</h2>
              <p className="mt-2 text-base font-bold text-gray-900">
                {roleLabel(role)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {mode === "runner"
                  ? "You are viewing GraceRun in Runner Mode."
                  : "You are viewing GraceRun as a customer."}
              </p>
              {canSwitchModes && (
                <div className="mt-3">
                  <ModeSwitchButton className="w-full rounded-xl bg-[#ED1C24] py-3 text-sm font-semibold text-white" />
                </div>
              )}
            </section>

            {user?.isRunner && mode === "runner" ? (
              <section className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-5">
                <h2 className="text-sm font-semibold text-fusion-red">Runner Profile</h2>
                <p className="mt-2 text-sm text-gray-700">
                  Registered runner · Payout via {user.runnerPaymentMethod}
                </p>
                <Link
                  href="/runner/earnings"
                  className="mt-3 inline-block text-sm font-semibold text-fusion-red underline"
                >
                  View earnings →
                </Link>
              </section>
            ) : null}

            {!canRunnerMode && (
              <Link
                href="/runner/terms"
                className="mt-4 block rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm"
              >
                <p className="font-semibold text-fusion-red">
                  I want to earn as a runner
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Agree to the runner terms and your account also becomes a runner
                </p>
              </Link>
            )}

            {mode === "customer" && (
              <Link
                href={trackHref}
                className="mt-4 block rounded-2xl border border-gray-100 bg-white p-4 text-center text-sm font-medium text-gray-700 shadow-sm"
              >
                Track an Order
              </Link>
            )}

            <p className="mt-6 text-center text-sm">
              <LegalLink href="/terms">Terms &amp; Conditions</LegalLink>
              <span className="mx-2 text-gray-400">·</span>
              <LegalLink href="/privacy">Privacy Policy</LegalLink>
            </p>

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
      <ChangePasswordModal open={changeOpen} onClose={() => setChangeOpen(false)} />
    </>
  );
}
