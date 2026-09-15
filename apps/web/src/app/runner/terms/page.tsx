"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAuth } from "@/components/RequireAuth";
import { useUser } from "@/context/UserContext";
import { registerRunner } from "@/lib/runners";

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
  const { user, isReady, setRunnerRegistered, setMode } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isReady) return;
    if (user?.isRunner) {
      router.replace("/runner/dashboard");
    }
  }, [isReady, user, router]);

  async function handleAgree() {
    if (!user?.uid) {
      setError("Please sign in again before becoming a runner.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const paymentId =
        user.runnerPaymentId ||
        user.phone?.trim() ||
        user.studentId.trim() ||
        user.email ||
        user.uid;
      const runnerId = await registerRunner({
        uid: user.uid,
        fullName: user.fullName.trim() || "Runner",
        studentId: user.studentId.trim() || user.uid.slice(0, 8),
        phone: user.phone?.trim() || paymentId,
        college: user.college,
        hall: user.hall,
        paymentMethod: user.runnerPaymentMethod ?? "PayMe",
        paymentId,
      });
      setRunnerRegistered(runnerId, {
        method: user.runnerPaymentMethod ?? "PayMe",
        id: paymentId,
      });
      setMode("runner");
      router.push("/runner/dashboard");
    } catch {
      setError("Could not activate runner access. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequireAuth>
      <LakersWallpaper>
        <AppHeader showBack backHref="/" title="Runner Terms" />

        <main className="mx-auto max-w-[480px] px-4 py-6 pb-32">
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
          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          </div>

          <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4 md:static md:mt-10 md:border-0 md:p-0">
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
