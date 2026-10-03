"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAuth } from "@/components/RequireAuth";
import { useUser } from "@/context/UserContext";
import { RunnerCollegeSelect } from "@/components/RunnerCollegeSelect";
import { commitRunnerActivation } from "@/lib/runners";
import { getAuthClient } from "@/lib/firebase";
import {
  routeAfterRunnerAgree,
  studentIdHint,
  studentIdPlaceholder,
  submitRunnerAgreement,
  validateStudentId,
} from "@/lib/runner-signup";

const SECTIONS = [
  {
    title: "1. Runner Responsibilities",
    body: [
      "Pick up the correct items from Fusion supermarket as listed on the order. You pay Fusion at the till; GraceRun reimburses you after delivery.",
      "Write the customer's full name on the Fusion receipt and attach it to the grocery bag. This is required on every order.",
      "Upload both a photo of the receipt and a screenshot of the bank/FPS transaction before you can mark delivered.",
      "Deliver orders to the customer's dorm hall lobby — not to individual rooms unless agreed.",
      "Attach the original Fusion receipt to the grocery bag, or place it inside the bag where the customer can find it.",
      "Take a photo of the bag at the delivery location with the receipt visible. This photo is required to mark an order as delivered.",
      "Allow location sharing while the order is active so the customer can see your progress.",
      "Communicate promptly if an item is out of stock or a price differs from the estimate.",
      "Handle all groceries with care — especially chilled, frozen, and fragile items.",
    ],
  },
  {
    title: "2. Delivery Standards",
    body: [
      "Accept available orders within 5 minutes of them appearing in the queue.",
      "Arrive at Fusion and mark 'Picked Up' within 20 minutes of accepting.",
      "Complete delivery to the dorm lobby within 45 minutes of accepting the order.",
      "Repeated failure to meet these timelines may result in warnings or suspension.",
    ],
  },
  {
    title: "3. Payment Terms",
    body: [
      "You pay Fusion at the till. GraceRun reimburses the receipt total plus your delivery fee after you deliver and the owner verifies your uploads.",
      "Customers pay GraceRun (not you) within 24 hours of delivery.",
      "Earnings and pending payouts are tracked in the Runner Dashboard and admin payouts page.",
    ],
  },
  {
    title: "4. Penalties for Miscarriage",
    body: [
      "Late delivery: 1st offence — warning; 2nd offence — 50% earnings deduction; 3rd offence — suspension.",
      "Wrong items: Report in the app immediately. Do not pay replacements from your own pocket unless GraceRun asks you to and reimburses you.",
      "No-show (accepting but not picking up): 14-day suspension; repeat offence — permanent ban.",
      "Theft or fraud: Immediate permanent ban and report to CUHK Security.",
      "Damaged goods due to runner negligence: Repair/replacement cost deducted from runner earnings.",
    ],
  },
  {
    title: "5. Runner Conduct",
    body: [
      "Treat customers and dorm staff with respect at all times.",
      "Do not harass, intimidate, or discriminate against any user.",
      "Do not share customer personal data (name, SID, room number, phone) outside the app.",
      "Do not solicit customers for personal business, other services, or off-platform payments.",
      "Do not use the GraceRun brand for any unauthorized purpose.",
    ],
  },
  {
    title: "6. Liability",
    body: [
      "Runners assume all risk while performing deliveries, including travel to/from Fusion and dorm lobbies.",
      "GraceRun is a matching platform only and is not responsible for runner safety, accidents, or injuries.",
      "Runners are independent contractors, not employees of GraceRun or CUHK.",
      "GraceRun is not liable for disputes between runners and customers regarding item quality or payment.",
    ],
  },
  {
    title: "7. Termination",
    body: [
      "GraceRun may suspend or terminate any runner account at any time, with or without cause.",
      "Grounds for termination include but are not limited to: policy violations, customer complaints, fraud, or inactivity.",
      "Upon termination, pending payouts for completed deliveries may be withheld pending investigation.",
    ],
  },
  {
    title: "8. Appeals Process",
    body: [
      "Runners may appeal a suspension or penalty within 7 days by emailing fusion-express@cuhk.edu.hk.",
      "Include your Student ID, order ID (if applicable), and a written explanation.",
      "Appeals are reviewed within 5 business days. Decisions are final.",
    ],
  },
];

export default function RunnerTermsPage() {
  const router = useRouter();
  const { user, isReady, setRunnerRegistered, setMode, rememberProfile } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [studentIdError, setStudentIdError] = useState("");
  const [studentId, setStudentId] = useState(user?.studentId ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [collegeId, setCollegeId] = useState(user?.runnerCollege ?? "");
  const [confirmation, setConfirmation] = useState("");
  const needsCollege = user?.campus !== "cityu";
  const campus = user?.campus === "cityu" ? "cityu" : "cuhk";

  useEffect(() => {
    if (!isReady) return;
    if (user?.isRunner) {
      router.replace("/runner/dashboard");
      return;
    }
    // Guest checkout accounts need a full customer/runner profile first.
    if (user?.isGuest) {
      router.replace("/profile?complete=runner");
    }
    setStudentId((current) => current || user?.studentId || "");
    setPhone((current) => current || user?.phone || "");
    setCollegeId((current) => current || user?.runnerCollege || "");
  }, [isReady, user, router]);

  async function handleAgree() {
    if (!user || !user.uid) {
      setError("Please sign in again before becoming a runner.");
      return;
    }
    const sidErr = validateStudentId(studentId);
    if (sidErr) {
      setStudentIdError(
        sidErr || "Student ID is required to become a runner.",
      );
      setError("");
      return;
    }
    setStudentIdError("");
    setError("");
    setLoading(true);
    try {
      const result = await submitRunnerAgreement(
        { ...user, uid: user.uid },
        { studentId, phone, collegeId },
        {
          getIdToken: async () =>
            (await getAuthClient().currentUser?.getIdToken()) ?? null,
          saveCollege: async (token, nextCollege) => {
            const res = await fetch("/api/runner/college", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ runnerCollege: nextCollege }),
            });
            const data = (await res.json()) as {
              error?: string;
              confirmation?: string;
              runnerCollege?: string;
              emailSent?: boolean;
            };
            if (!res.ok) {
              throw new Error(data.error || "Could not save your college.");
            }
            return data;
          },
          activateRunner: async (input) => {
            const saved = await commitRunnerActivation(input);
            return { runnerId: saved.runnerId, role: "both" as const };
          },
        },
      );
      if (!result.ok) {
        if (/student id/i.test(result.error)) {
          setStudentIdError(result.error);
          setError("");
        } else {
          setError(result.error);
        }
        return;
      }
      rememberProfile({
        ...user,
        phone: result.phone,
        studentId: result.studentId,
        role: result.role,
        isRunner: true,
        runnerId: result.runnerId,
        runnerCollege: result.runnerCollege ?? user.runnerCollege,
        runnerCollegeLockedAt:
          result.runnerCollegeLockedAt ?? user.runnerCollegeLockedAt,
      });
      if (result.collegeNote) {
        setConfirmation(result.collegeNote);
        sessionStorage.setItem("gr_college_confirmation", result.collegeNote);
      }
      setRunnerRegistered(result.runnerId, result.payment, {
        remote: false,
        role: result.role,
      });
      setMode("runner");
      if (routeAfterRunnerAgree(true)) {
        router.push("/runner/dashboard");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not activate runner access. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth>
      <LakersWallpaper>
        <AppHeader showBack backHref="/" title="Runner Terms" />

        <main className="mx-auto max-w-[480px] px-4 py-6 pb-64">
          <div className="rounded-2xl bg-white/90 p-5 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Runner Terms &amp; Conditions
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Read these terms, then tap I Agree. That is all you need to start
            picking up orders.
          </p>

          <div className="mt-6 space-y-8">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="text-base font-bold text-fusion-red">
                  {section.title}
                </h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
                  {section.body.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <div className="mt-6 scroll-mb-64">
            <label htmlFor="runner-student-id" className="block text-base font-semibold text-gray-900">
              Student ID
            </label>
            <input
              id="runner-student-id"
              name="studentId"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              required
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value);
                if (studentIdError) setStudentIdError("");
              }}
              placeholder={studentIdPlaceholder(campus)}
              aria-invalid={studentIdError ? true : undefined}
              aria-describedby={
                studentIdError ? "runner-student-id-error" : undefined
              }
              className="mt-1 w-full min-h-12 rounded-xl border border-gray-200 bg-white px-4 py-3 text-[16px] text-gray-900"
            />
            {studentIdError ? (
              <p id="runner-student-id-error" className="mt-1 text-sm text-red-700">
                {studentIdError}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-gray-500">{studentIdHint(campus)}</p>
          </div>
          {needsCollege && (
            <div className="mt-6 scroll-mb-64">
              <RunnerCollegeSelect value={collegeId} onChange={setCollegeId} />
            </div>
          )}
          {confirmation && (
            <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
              {confirmation}
            </p>
          )}
          <div className="mt-6 scroll-mb-64">
            <label htmlFor="runner-phone" className="block text-xs font-medium text-gray-600">
              Phone number
            </label>
            <input
              id="runner-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9123 4567"
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900"
            />
            <p className="mt-1 text-xs text-gray-500">
              Required for runners. We use it for payouts and to reach you about orders.
            </p>
          </div>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:static md:mt-10 md:border-0 md:p-0">
            {error && (
              <p className="mx-auto mb-3 max-w-[480px] rounded-xl bg-red-50 px-4 py-3 text-base text-red-700">
                {error}
              </p>
            )}
            <div className="mx-auto flex max-w-[480px] flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleAgree()}
                disabled={loading}
                className="flex-1 rounded-xl bg-fusion-red py-4 text-base font-semibold text-white shadow-md disabled:opacity-60"
              >
                {loading ? "Saving…" : "I Agree"}
              </button>
              <Link
                href="/"
                className="flex-1 rounded-xl border border-gray-300 py-4 text-center text-base font-semibold text-gray-700"
              >
                Cancel
              </Link>
            </div>
          </div>
        </main>
      </LakersWallpaper>
    </RequireAuth>
  );
}
