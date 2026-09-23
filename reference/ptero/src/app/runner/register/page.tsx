"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { PrototypeBanner } from "@/components/PrototypeBanner";
import { formInputClassName } from "@/components/DeliveryAddressFields";
import { CAMPUS } from "@/config/campus";
import { COLLEGES, type CollegeId } from "@/config/canteen/colleges";
import { useAppState, useUser } from "@/context/AppState";
import { validatePhone } from "@/lib/auth";

export default function RunnerRegisterPage() {
  const router = useRouter();
  const { user } = useUser();
  const { registerRunner } = useAppState();
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState<CollegeId | "">("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    if (!college) {
      setError("Select your CityU residence (KLNT or MOS).");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await registerRunner({ phone, college });
      router.push("/runner/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register as runner.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <PrototypeBanner />
      <AppHeader showBack backHref="/runner" title="Runner phone" />
      <main className="mx-auto max-w-[480px] px-4 py-6 pb-28">
        <h1 className="text-lg font-bold">Runner details</h1>
        <p className="mt-1 text-sm text-gray-600">
          Customers never enter a phone. {CAMPUS.brandName} runners must, so the
          hall drop-off can be coordinated. Your residence unlocks 10% canteen
          discounts when you pick up matching hall canteens.
        </p>
        {!user || user.isGuest ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Sign up with your CityU email first, then come back to add a phone.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{user.email}</p>
            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <label className="block text-xs font-medium text-gray-600">
              Hong Kong mobile
              <input
                required
                inputMode="tel"
                placeholder="5123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={formInputClassName}
              />
            </label>
            <label className="block text-xs font-medium text-gray-600">
              Your residence (for canteen discount)
              <select
                required
                value={college}
                onChange={(e) => setCollege(e.target.value as CollegeId | "")}
                className={formInputClassName}
              >
                <option value="">Select residence</option>
                {COLLEGES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shortName} — {c.fullName}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-[11px] text-gray-500">
              Matching canteen pickups (e.g. MOS runner → Hall Canteen @MOS)
              unlock a 10% food discount for the customer.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? "Saving…" : "Start running"}
            </button>
          </form>
        )}
      </main>
    </AppShell>
  );
}
