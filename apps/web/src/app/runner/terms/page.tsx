"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAuth } from "@/components/RequireAuth";
import { useUser } from "@/context/UserContext";

const SECTIONS = [
  {
    title: "1. Runner Responsibilities",
    body: [
      "Pick up the correct items from Fusion supermarket as listed on the order.",
      "Verify item names, quantities, and weights (especially for variable-price items).",
      "Deliver orders to the customer's dorm hall lobby — not to individual rooms unless agreed.",
      "Take a photo proof of delivery at the lobby when marking an order as delivered.",
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
      "Runners earn 70% of the $10 delivery fee ($7.00 HKD) per successfully completed delivery.",
      "Earnings are tracked in the Runner Dashboard under the Earnings tab.",
      "Payouts are processed weekly via your registered PayMe or FPS account.",
      "Pending payments appear until the customer's order is marked delivered and payment is confirmed.",
    ],
  },
  {
    title: "4. Penalties for Miscarriage",
    body: [
      "Late delivery: 1st offence — warning; 2nd offence — 50% earnings deduction; 3rd offence — suspension.",
      "Wrong items: Runner must replace the item at their own cost or forfeit the delivery fee for that order.",
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
      "Do not use the Fusion Express brand for any unauthorized purpose.",
    ],
  },
  {
    title: "6. Liability",
    body: [
      "Runners assume all risk while performing deliveries, including travel to/from Fusion and dorm lobbies.",
      "Fusion Express is a matching platform only and is not responsible for runner safety, accidents, or injuries.",
      "Runners are independent contractors, not employees of Fusion Express or CUHK.",
      "Fusion Express is not liable for disputes between runners and customers regarding item quality or payment.",
    ],
  },
  {
    title: "7. Termination",
    body: [
      "Fusion Express may suspend or terminate any runner account at any time, with or without cause.",
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
  const { user, isReady, acceptRunnerTerms } = useUser();

  useEffect(() => {
    if (!isReady) return;
    if (user?.isRunner) {
      router.replace("/runner/dashboard");
    }
  }, [isReady, user, router]);

  function handleAgree() {
    acceptRunnerTerms();
    router.push("/runner/register");
  }

  return (
    <RequireAuth>
      <LakersWallpaper>
        <AppHeader showBack backHref="/home" title="Runner Terms" />

        <main className="mx-auto max-w-[480px] px-4 py-6 pb-32">
          <div className="rounded-2xl bg-white/90 p-5 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Runner Terms &amp; Conditions
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Please read carefully before becoming a Fusion Express runner.
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
          </div>

          <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4 md:static md:mt-10 md:border-0 md:p-0">
            <div className="mx-auto flex max-w-[480px] flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleAgree}
                className="flex-1 rounded-xl bg-fusion-red py-4 text-base font-semibold text-white shadow-md"
              >
                I Agree
              </button>
              <Link
                href="/home"
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
