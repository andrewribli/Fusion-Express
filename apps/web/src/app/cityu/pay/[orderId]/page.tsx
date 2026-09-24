"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/ptero/components/AppHeader";
import { AppShell } from "@/ptero/components/AppShell";
import { PrototypeBanner } from "@/ptero/components/PrototypeBanner";
import { CAMPUS } from "@/ptero/config/campus";
import { useAppState } from "@/ptero/context/AppState";
import { customerAmountDue, formatHkd } from "@/ptero/lib/types";
import { formInputClassName } from "@/ptero/components/DeliveryAddressFields";

export default function PayPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const router = useRouter();
  const { orders, markPaid } = useAppState();
  const order = orders.find((o) => o.id === orderId);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  if (!order) {
    return (
      <AppShell>
        <PrototypeBanner />
        <AppHeader showBack title="Pay" />
        <main className="mx-auto max-w-[480px] px-4 py-10 text-center text-sm text-gray-600">
          Order not found.
        </main>
      </AppShell>
    );
  }

  const due = customerAmountDue(order);
  const payable = order.status === "delivered";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const current = order;
    if (!current || !payable) return;
    if (number.replace(/\s/g, "").length < 12 || !expiry || cvc.length < 3 || !name.trim()) {
      setError("Enter card details to simulate Airwallex checkout.");
      return;
    }
    setPaying(true);
    setError("");
    const paidOrderId = current.id;
    window.setTimeout(() => {
      markPaid(paidOrderId);
      setPaying(false);
      router.push(`/cityu/track/${paidOrderId}`);
    }, 900);
  }

  return (
    <AppShell>
      <PrototypeBanner />
      <AppHeader showBack backHref={`/cityu/track/${order.id}`} title="Pay with Airwallex" />
      <main className="mx-auto max-w-[480px] px-4 py-4 pb-28">
        <div className="rounded-2xl bg-[#111827] p-4 text-white shadow-sm">
          <p className="text-xs uppercase tracking-wide text-white/60">Airwallex · prototype</p>
          <p className="mt-1 text-lg font-bold">{CAMPUS.brandName}</p>
          <p className="mt-3 text-3xl font-extrabold">{formatHkd(due)}</p>
          <p className="mt-1 text-xs text-white/70">
            {CAMPUS.supermarket} receipt + delivery{order.tip ? " + tip" : ""}
          </p>
        </div>

        {order.status === "paid" ? (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            This order is already paid.
          </p>
        ) : !payable ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Pay after the runner marks the order delivered.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">
              Demo checkout only — no real charge. Live GraceRun still uses the production
              Airwallex keys; this CityU prototype never talks to them.
            </p>
            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <label className="block text-xs font-medium text-gray-600">
              Name on card
              <input value={name} onChange={(e) => setName(e.target.value)} className={formInputClassName} />
            </label>
            <label className="block text-xs font-medium text-gray-600">
              Card number
              <input
                inputMode="numeric"
                placeholder="4242 4242 4242 4242"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className={formInputClassName}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-gray-600">
                Expiry
                <input
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className={formInputClassName}
                />
              </label>
              <label className="block text-xs font-medium text-gray-600">
                CVC
                <input
                  inputMode="numeric"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  className={formInputClassName}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={paying}
              className="w-full rounded-xl bg-fusion-red py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {paying ? "Processing…" : `Pay ${formatHkd(due)}`}
            </button>
          </form>
        )}
        <p className="mt-4 text-center">
          <Link href={`/cityu/track/${order.id}`} className="text-xs font-semibold text-[#ED1C24]">
            Back to tracking
          </Link>
        </p>
      </main>
    </AppShell>
  );
}
