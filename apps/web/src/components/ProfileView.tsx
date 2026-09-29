"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { LegalLink } from "@/components/LegalLink";
import { GuestAccountPrompt } from "@/components/GuestAccountPrompt";
import { ModeSwitchButton } from "@/components/ModeSwitchButton";
import { DeliveryIdentitySettings } from "@/components/DeliveryIdentitySettings";
import { useUser } from "@/context/UserContext";
import { updateUserProfileDoc } from "@/lib/users";
import { useActiveCustomerOrders } from "@/lib/use-active-orders";
import { useDemoAuth } from "@/lib/use-demo-auth";
import { roleLabel } from "@/lib/roles";

export function ProfileView() {
  const {
    user,
    logout,
    firebaseEnabled,
    role,
    canRunnerMode,
    canSwitchModes,
    mode,
    rememberProfile,
  } = useUser();
  const { href: trackHref } = useActiveCustomerOrders();
  const demoAuth = useDemoAuth();
  const [changeOpen, setChangeOpen] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountSaved, setAccountSaved] = useState(false);
  const canChangePassword = firebaseEnabled && !demoAuth && Boolean(user?.email);
  const isGuest = Boolean(user?.isGuest);

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.uid, user?.fullName, user?.phone]);

  useEffect(() => {
    if (!canChangePassword) return;
    if (window.location.hash === "#password") setChangeOpen(true);
  }, [canChangePassword]);

  const accountDirty = useMemo(() => {
    if (!user) return false;
    if (fullName.trim() !== (user.fullName ?? "").trim()) return true;
    if (user.isRunner && phone.trim() !== (user.phone ?? "").trim()) return true;
    return false;
  }, [user, fullName, phone]);

  async function saveAccount() {
    if (!user?.uid) return;
    const name = fullName.trim();
    if (!name) {
      setAccountError("Enter your name.");
      return;
    }
    if (user.isRunner) {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 8) {
        setAccountError("Enter a valid phone number.");
        return;
      }
    }
    setAccountBusy(true);
    setAccountError("");
    setAccountSaved(false);
    try {
      const patch = {
        fullName: name,
        ...(user.isRunner ? { phone: phone.trim() } : {}),
      };
      await updateUserProfileDoc(user.uid, patch);
      rememberProfile({ ...user, ...patch });
      setAccountSaved(true);
      window.setTimeout(() => setAccountSaved(false), 2500);
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setAccountBusy(false);
    }
  }

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
              {!isGuest && user?.uid ? (
                <>
                  <label className="mt-3 block text-sm font-medium text-gray-800" htmlFor="account-full-name">
                    Full name
                  </label>
                  <input
                    id="account-full-name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    disabled={accountBusy}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  />
                  {user.email ? (
                    <p className="mt-3 text-sm text-gray-600">{user.email}</p>
                  ) : null}
                  {user.isRunner ? (
                    <>
                      <label
                        className="mt-3 block text-sm font-medium text-gray-800"
                        htmlFor="account-phone"
                      >
                        Phone
                      </label>
                      <input
                        id="account-phone"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        disabled={accountBusy}
                        inputMode="tel"
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                      />
                    </>
                  ) : null}
                  <button
                    type="button"
                    disabled={accountBusy || !accountDirty}
                    onClick={() => void saveAccount()}
                    className="mt-4 min-h-12 w-full rounded-xl bg-[#ED1C24] text-sm font-bold text-white disabled:opacity-50"
                  >
                    {accountBusy ? "Saving…" : "Save account"}
                  </button>
                  {accountSaved ? (
                    <p className="mt-2 text-sm font-medium text-emerald-700">Saved.</p>
                  ) : null}
                  {accountError ? (
                    <p className="mt-2 text-sm text-red-700">{accountError}</p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="mt-2 text-lg font-bold text-gray-900">{user?.fullName}</p>
                  {user?.email && (
                    <p className="text-sm text-gray-600">{user.email}</p>
                  )}
                </>
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

            {!isGuest && user?.uid ? <DeliveryIdentitySettings /> : null}

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
