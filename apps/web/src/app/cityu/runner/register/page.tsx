"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/ptero/components/AppHeader";
import { AppShell } from "@/ptero/components/AppShell";
import { PrototypeBanner } from "@/ptero/components/PrototypeBanner";
import { formInputClassName } from "@/ptero/components/DeliveryAddressFields";
import { CAMPUS } from "@/ptero/config/campus";
import { COLLEGES, getCollege, type CollegeId } from "@/ptero/config/canteen/colleges";
import { useUser as useLocalUser } from "@/ptero/context/AppState";
import { useUser } from "@/context/UserContext";
import { commitRunnerActivation } from "@/lib/runners";
import {
  studentIdHint,
  studentIdPlaceholder,
  validateStudentId,
} from "@/lib/runner-signup";
import { validatePhone } from "@/ptero/lib/auth";

export default function RunnerRegisterPage() {
  const router = useRouter();
  const shared = useUser();
  const { setMode } = useLocalUser();
  const account = shared.user && !shared.user.isGuest ? shared.user : null;
  const [phone, setPhone] = useState(account?.phone ?? "");
  const [studentId, setStudentId] = useState(account?.studentId ?? "");
  const [studentIdError, setStudentIdError] = useState("");
  const [college, setCollege] = useState<CollegeId | "">("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!account?.uid) {
      setError("Sign up with your CityU email before becoming a runner.");
      return;
    }
    const sidErr = validateStudentId(studentId);
    if (sidErr) {
      setStudentIdError(sidErr || "Student ID is required to become a runner.");
      setError("");
      return;
    }
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    if (!college) {
      setError("Select your CityU residence (KLNT or MOS).");
      return;
    }
    setStudentIdError("");
    setLoading(true);
    setError("");
    try {
      const residence = getCollege(college);
      const saved = await commitRunnerActivation({
        uid: account.uid,
        fullName: account.fullName?.trim() || "Runner",
        studentId: studentId.replace(/\s+/g, ""),
        phone,
        college,
        hall: residence?.compound ?? "",
        paymentMethod: "PayMe",
        paymentId: phone.replace(/\D/g, ""),
      });
      const paymentId = phone.replace(/\D/g, "");
      shared.rememberProfile({
        ...account,
        phone: paymentId,
        studentId: studentId.replace(/\s+/g, ""),
        role: saved.role,
        isRunner: true,
        runnerId: saved.runnerId,
        runnerPaymentMethod: "PayMe",
        runnerPaymentId: paymentId,
      });
      shared.setRunnerRegistered(
        saved.runnerId,
        { method: "PayMe", id: paymentId },
        { remote: false, role: saved.role },
      );
      shared.setMode("runner");
      setMode("runner");
      router.push("/cityu/runner/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register as runner.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <PrototypeBanner />
      <AppHeader showBack backHref="/cityu/runner" title="Runner phone" />
      <main className="mx-auto max-w-[480px] px-4 py-6 pb-28">
        <h1 className="text-lg font-bold">Runner details</h1>
        <p className="mt-1 text-sm text-gray-600">
          Customers never enter a phone. {CAMPUS.brandName} runners must, so the
          hall drop-off can be coordinated. Your residence unlocks 10% canteen
          discounts when you pick up matching hall canteens.
        </p>
        {!account ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Sign up with your CityU email first, then come back to add a phone.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{account.email}</p>
            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <label className="block text-xs font-medium text-gray-600">
              Student ID
              <input
                id="cityu-runner-student-id"
                required
                inputMode="numeric"
                autoComplete="off"
                value={studentId}
                onChange={(e) => {
                  setStudentId(e.target.value);
                  if (studentIdError) setStudentIdError("");
                }}
                placeholder={studentIdPlaceholder("cityu")}
                aria-invalid={studentIdError ? true : undefined}
                aria-describedby={
                  studentIdError ? "cityu-runner-student-id-error" : undefined
                }
                className={formInputClassName}
              />
            </label>
            {studentIdError ? (
              <p id="cityu-runner-student-id-error" className="text-sm text-red-700">
                {studentIdError}
              </p>
            ) : (
              <p className="text-[11px] text-gray-500">{studentIdHint("cityu")}</p>
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
