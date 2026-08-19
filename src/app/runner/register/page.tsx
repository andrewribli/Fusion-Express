"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { DeliveryAddressFields } from "@/components/DeliveryAddressFields";
import { RequireAuth } from "@/components/RequireAuth";
import { useUser } from "@/context/UserContext";
import { registerRunner } from "@/lib/runners";

const inputClassName =
  "mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20";

export default function RunnerRegisterPage() {
  const router = useRouter();
  const { user, termsAccepted, setRunnerRegistered } = useUser();

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [studentId, setStudentId] = useState(user?.studentId ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [college, setCollege] = useState(user?.college ?? "");
  const [hall, setHall] = useState(user?.hall ?? "");
  const [paymentMethod, setPaymentMethod] = useState<"PayMe" | "FPS">("PayMe");
  const [paymentId, setPaymentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!termsAccepted) {
      router.replace("/runner/terms");
    }
  }, [termsAccepted, router]);

  useEffect(() => {
    if (user?.isRunner) {
      router.replace("/runner/dashboard");
    }
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const runnerId = await registerRunner({
        fullName: fullName.trim(),
        studentId: studentId.trim(),
        phone: phone.trim(),
        college,
        hall,
        paymentMethod,
        paymentId: paymentId.trim(),
      });

      setRunnerRegistered(runnerId, {
        method: paymentMethod,
        id: paymentId.trim(),
      });
      router.push("/runner/dashboard");
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-50">
        <AppHeader showBack backHref="/runner/terms" title="Runner Registration" />

        <main className="mx-auto max-w-[480px] px-4 py-6">
          <h1 className="text-xl font-bold text-gray-900">Become a Runner</h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete your profile to start accepting deliveries.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600">
                Full Name
              </label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600">
                Student ID
              </label>
              <input
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className={inputClassName}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600">
                Phone Number
              </label>
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClassName}
              />
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-xs font-semibold text-gray-500">College / Hall</p>
              <div className="mt-3">
                <DeliveryAddressFields
                  college={college}
                  hall={hall}
                  roomNumber=""
                  onCollegeChange={setCollege}
                  onHallChange={setHall}
                  onRoomNumberChange={() => {}}
                  hideRoom
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as "PayMe" | "FPS")
                }
                className={inputClassName}
              >
                <option value="PayMe">PayMe</option>
                <option value="FPS">FPS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600">
                {paymentMethod} ID / Phone
              </label>
              <input
                required
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
                placeholder={
                  paymentMethod === "PayMe" ? "PayMe phone number" : "FPS identifier"
                }
                className={inputClassName}
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-fusion-red py-4 text-base font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Submitting…" : "Submit Registration"}
            </button>
          </form>
        </main>
      </div>
    </RequireAuth>
  );
}
