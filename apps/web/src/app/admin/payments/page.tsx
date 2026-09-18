"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAdmin } from "@/components/RequireAdmin";
import { fetchOrder, confirmCustomerPayment } from "@/lib/orders";
import { notifyOrderStatus } from "@/lib/notify-email";
import {
  fetchPaymentSubmissions,
  updatePaymentSubmissionStatus,
  type PaymentSubmission,
} from "@/lib/payment-submissions";
import type { Order } from "@/lib/types";
import { customerAmountDue } from "@/lib/order-status";

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<PaymentSubmission[]>([]);
  const [orders, setOrders] = useState<Record<string, Order>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    const list = await fetchPaymentSubmissions();
    setRows(list);
    const next: Record<string, Order> = {};
    await Promise.all(
      list.map(async (row) => {
        const order = await fetchOrder(row.orderId);
        if (order) next[row.orderId] = order;
      }),
    );
    setOrders(next);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load submissions.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirm(row: PaymentSubmission) {
    setSaving(row.id);
    setError("");
    try {
      await updatePaymentSubmissionStatus(row.id, "confirmed");
      await confirmCustomerPayment(row.orderId);
      const order = orders[row.orderId];
      if (order?.customerEmail) {
        void notifyOrderStatus({
          customerEmail: order.customerEmail,
          orderId: order.id,
          status: "customer_paid",
        });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm payment.");
    } finally {
      setSaving(null);
    }
  }

  async function reject(row: PaymentSubmission) {
    setSaving(row.id);
    setError("");
    try {
      await updatePaymentSubmissionStatus(row.id, "rejected");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject.");
    } finally {
      setSaving(null);
    }
  }

  const pending = rows.filter((r) => r.status === "pending");
  const others = rows.filter((r) => r.status !== "pending");

  return (
    <RequireAdmin>
      <AppShell hideNav>
        <LakersWallpaper>
          <AppHeader showBack backHref="/admin/users" title="Payment Submissions" />
          <main className="mx-auto max-w-3xl px-4 py-6">
            <div className="mb-4 flex flex-wrap gap-3 text-sm">
              <Link href="/admin/users" className="font-medium text-[#ED1C24] underline">
                Users
              </Link>
              <Link href="/admin/payouts" className="font-medium text-[#ED1C24] underline">
                Payouts
              </Link>
            </div>
            {error && (
              <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-gray-500">
                No payment screenshots yet.
              </p>
            ) : (
              <div className="space-y-6">
                <section>
                  <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
                    Pending ({pending.length})
                  </h2>
                  <ul className="space-y-4">
                    {pending.map((row) => {
                      const order = orders[row.orderId];
                      return (
                        <li
                          key={row.id}
                          className="rounded-2xl bg-white p-4 shadow-sm"
                        >
                          <p className="font-bold text-gray-900">{row.orderId}</p>
                          <p className="text-xs text-gray-500">
                            {order?.customerName || row.userId} ·{" "}
                            {row.submittedAt.toLocaleString("en-HK")}
                          </p>
                          {order && (
                            <p className="mt-1 text-lg font-bold text-[#ED1C24]">
                              ${customerAmountDue(order)}
                            </p>
                          )}
                          {row.note && (
                            <p className="mt-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
                              {row.note}
                            </p>
                          )}
                          {row.screenshotUrl.startsWith("mock://") ? (
                            <p className="mt-2 text-xs text-gray-500">Screenshot uploaded</p>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.screenshotUrl}
                              alt="Payment screenshot"
                              className="mt-3 max-h-72 w-full rounded-xl object-contain bg-gray-50"
                            />
                          )}
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              disabled={saving === row.id}
                              onClick={() => void confirm(row)}
                              className="flex-1 rounded-xl bg-[#ED1C24] py-2.5 text-sm font-bold text-white disabled:opacity-60"
                            >
                              {saving === row.id ? "Saving…" : "Confirm Payment"}
                            </button>
                            <button
                              type="button"
                              disabled={saving === row.id}
                              onClick={() => void reject(row)}
                              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-60"
                            >
                              Reject
                            </button>
                          </div>
                        </li>
                      );
                    })}
                    {pending.length === 0 && (
                      <p className="text-sm text-gray-500">Nothing waiting.</p>
                    )}
                  </ul>
                </section>
                {others.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
                      Reviewed
                    </h2>
                    <ul className="space-y-2">
                      {others.map((row) => (
                        <li
                          key={row.id}
                          className="rounded-xl bg-white px-4 py-3 text-sm shadow-sm"
                        >
                          <span className="font-semibold">{row.orderId}</span>
                          {" · "}
                          <span className="capitalize text-gray-600">{row.status}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </main>
        </LakersWallpaper>
      </AppShell>
    </RequireAdmin>
  );
}
