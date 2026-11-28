"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { DeleteAccountSection } from "@/components/DeleteAccountSection";
import { DeliveryAddressFields } from "@/components/DeliveryAddressFields";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { LegalLink } from "@/components/LegalLink";
import { GuestAccountPrompt } from "@/components/GuestAccountPrompt";
import { ModeSwitchButton } from "@/components/ModeSwitchButton";
import { ShareGraceRunButton } from "@/components/ShareGraceRunButton";
import { useUser } from "@/context/UserContext";
import { isAdminUid } from "@/lib/admins";
import { useActiveCustomerOrders } from "@/lib/use-active-orders";
import { useDemoAuth } from "@/lib/use-demo-auth";
import { updateUserProfileDoc } from "@/lib/users";
import { roleLabel } from "@/lib/roles";
import type { CampusId } from "@fusion-express/shared/campus";
import { hasPasswordProvider } from "@/lib/auth";
import { getAuthClient } from "@/lib/firebase";

export function ProfileView() {
  const {
    user,
    logout,
    firebaseEnabled,
    role,
    canRunnerMode,
    canSwitchModes,
    mode,
    updateProfile,
  } = useUser();
  const { href: trackHref } = useActiveCustomerOrders();
  const demoAuth = useDemoAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [showReal, setShowReal] = useState(user?.isAnonymous !== true);
  const [college, setCollege] = useState(user?.college ?? "");
  const [hall, setHall] = useState(user?.hall ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void isAdminUid(user?.uid).then((ok) => {
      if (!cancelled) setIsAdmin(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const canChangePassword =
    firebaseEnabled &&
    !demoAuth &&
    Boolean(user?.email) &&
    hasPasswordProvider(
      (() => {
        try {
          return getAuthClient().currentUser;
        } catch {
          return null;
        }
      })(),
    );
  const isGuest = Boolean(user?.isGuest);
  const campus: CampusId = user?.campus === "cityu" ? "cityu" : "cuhk";

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setDisplayName(user?.displayName ?? "");
    setShowReal(user?.isAnonymous !== true);
    setCollege(user?.college ?? "");
    setHall(user?.hall ?? "");
  }, [user?.fullName, user?.displayName, user?.isAnonymous, user?.college, user?.hall]);

  useEffect(() => {
    if (!canChangePassword) return;
    if (window.location.hash === "#password") setChangeOpen(true);
  }, [canChangePassword]);

  async function saveProfile() {
    if (!user?.uid) return;
    const name = fullName.trim();
    if (!name) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const patch = {
        fullName: name,
        displayName: displayName.trim() || undefined,
        isAnonymous: !showReal,
        college,
        hall,
        campus,
      };
      await updateUserProfileDoc(user.uid, patch);
      updateProfile({ ...user, ...patch });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AppShell>
        <LakersWallpaper>
          <AppHeader title="Profile Settings" />

          <main id="account" className="mx-auto max-w-[480px] px-4 py-6">
            {isGuest && (
              <div className="mb-4">
                <GuestAccountPrompt />
              </div>
            )}

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-500">Account</h2>
              <label className="mt-3 block text-xs font-medium text-gray-600">
                Full name
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
                />
              </label>
              <label className="mt-3 block text-xs font-medium text-gray-600">
                Display name on deliveries
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={fullName || "Optional"}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
                />
              </label>
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showReal}
                  onChange={(e) => setShowReal(e.target.checked)}
                />
                Show my real name to the other person on an active order
              </label>
              {user?.email && (
                <p className="mt-3 text-sm text-gray-600">{user.email}</p>
              )}
              {user?.isRunner && user.phone && (
                <p className="text-sm text-gray-600">Phone: {user.phone}</p>
              )}
              {error ? <p className="mt-2 text-sm text-[#ED1C24]">{error}</p> : null}
              {saved ? <p className="mt-2 text-sm text-green-700">Saved.</p> : null}
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={saving || !user?.uid}
                className="mt-4 w-full rounded-xl bg-[#ED1C24] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
            </section>

            <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-500">Delivery</h2>
              <p className="mt-1 text-xs text-gray-500">
                Default hall lobby for checkout.
              </p>
              <div className="mt-3">
                <DeliveryAddressFields
                  campus={campus}
                  college={college}
                  hall={hall}
                  onCollegeChange={setCollege}
                  onHallChange={setHall}
                  required={false}
                  showPricing={false}
                />
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-500">Orders</h2>
              <Link
                href={trackHref}
                className="mt-3 block rounded-xl border border-gray-200 py-3 text-center text-sm font-semibold text-gray-800"
              >
                Track an order
              </Link>
            </section>

            <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-500">Security</h2>
              {canChangePassword && !isGuest && (
                <button
                  type="button"
                  onClick={() => setChangeOpen(true)}
                  className="mt-3 w-full rounded-xl border border-[#ED1C24] bg-white py-3 text-sm font-semibold text-[#ED1C24]"
                >
                  Change password
                </button>
              )}
              <DeleteAccountSection />
            </section>

            {isAdmin ? (
              <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-500">Admin</h2>
                <p className="mt-2 text-xs text-gray-500">
                  Support inbox and admin tools.
                </p>
                <Link
                  href="/admin/support"
                  className="mt-3 block rounded-xl bg-gray-900 py-3 text-center text-sm font-semibold text-white"
                >
                  Open admin support
                </Link>
                <Link
                  href="/admin/users"
                  className="mt-2 block rounded-xl border border-gray-200 py-3 text-center text-sm font-semibold text-gray-800"
                >
                  Admin dashboard
                </Link>
              </section>
            ) : null}

            <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-500">Support</h2>
              <Link
                href="/profile?chat=1"
                className="mt-3 block rounded-xl bg-[#ED1C24] py-3 text-center text-sm font-semibold text-white"
              >
                Message support
              </Link>
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

            <ShareGraceRunButton />

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
