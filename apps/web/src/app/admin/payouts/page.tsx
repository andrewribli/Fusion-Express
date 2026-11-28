"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { OrderChannelBadge } from "@/components/OrderChannelBadge";
import { RequireAdmin } from "@/components/RequireAdmin";
import {
  fetchAdminReviewOrders,
  markRunnerPayout,
  uploadRunnerPayoutProof,
  verifyAdminDelivery,
} from "@/lib/orders";
import { notifyOrderStatus } from "@/lib/notify-email";
import {
  adminPayoutLabel,
  groceryAmountDue,
  orderTipTotal,
  runnerEarningsFromOrder,
  runnerReimburseTotal,
} from "@/lib/order-status";
import type { Order } from "@/lib/types";

function Proof({ url, label }: { url?: string; label: string }) {
  if (!url) {
    return <p className="text-xs text-red-600">{label}: missing</p>;
  }
  if (url.startsWith("mock://")) {
    return <p className="text-xs text-gray-500">{label}: uploaded</p>;
  }
  const isPdf = /\.pdf($|\?)/i.test(url) || url.includes("application/pdf");
  if (isPdf) {
    return (
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-sm font-semibold text-[#ED1C24] underline"
        >
          Open PDF
        </a>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className="mt-1 max-h-48 w-full rounded-xl object-contain bg-gray-50" />
    </div>
  );
}

export default function AdminPayoutsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [nameOk, setNameOk] = useState<Record<string, boolean>>({});
  const [proofFiles, setProofFiles] = useState<Record<string, File | undefined>>(
    {},
  );

  async function load() {
    setError("");
    const rows = await fetchAdminReviewOrders();
    setOrders(rows);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load payouts.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function verify(order: Order) {
    setSaving(order.id);
    try {
      await verifyAdminDelivery(order.id, {
        customerNameOnReceipt: Boolean(nameOk[order.id]),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify.");
    } finally {
      setSaving(null);
    }
  }

  async function payRunner(order: Order) {
    setSaving(order.id);
    try {
      let proofUrl = order.runnerPayoutProofUrl;
      const file = proofFiles[order.id];
      if (file) {
        proofUrl = await uploadRunnerPayoutProof(order.id, file, file.name);
      }
      await markRunnerPayout(order.id, { proofUrl });
      void notifyOrderStatus({
        extraEmails: order.runnerEmail ? [order.runnerEmail] : [],
        orderId: order.id,
        status: "runner_paid",
      });
      setProofFiles((prev) => {
        const next = { ...prev };
        delete next[order.id];
        return next;
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark runner paid.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <RequireAdmin>
      <AppShell hideNav>
        <LakersWallpaper>
          <AppHeader showBack backHref="/admin/users" title="Payouts" />
          <main className="mx-auto max-w-3xl px-4 py-6">
            <div className="rounded-2xl bg-white/95 p-4 shadow-sm sm:p-6">
              <h1 className="text-xl font-bold text-gray-900">
                Verify &amp; pay runners
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Check the receipt and bank screenshot, reimburse the runner, then
                collect from the customer. Upload your transfer proof so the runner
                can confirm payment.
              </p>
              <p className="mt-2 text-xs">
                <Link href="/admin/users" className="font-medium text-[#ED1C24] underline">
                  Users
                </Link>
                {" · "}
                <Link href="/admin/messaging" className="font-medium text-[#ED1C24] underline">
                  Messaging
                </Link>
                {" · "}
                <Link href="/admin/payments" className="font-medium text-[#ED1C24] underline">
                  Payment submissions
                </Link>
                {" · "}
                <Link href="/admin/refunds" className="font-medium text-[#ED1C24] underline">
                  Refunds
                </Link>
                {" · "}
                <Link href="/admin/feedback" className="font-medium text-[#ED1C24] underline">
                  Feedback
                </Link>
                {" · "}
                <Link href="/admin/warnings" className="font-medium text-[#ED1C24] underline">
                  Warnings
                </Link>
              </p>
              {error && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}
              {loading ? (
                <p className="mt-4 text-sm text-gray-500">Loading…</p>
              ) : orders.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">No delivered orders yet.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {orders.map((order) => {
                    const spent = groceryAmountDue(order);
                    const reimburse = runnerReimburseTotal(order);
                    const tips = orderTipTotal(order);
                    const payTotal = Math.round((reimburse + tips) * 100) / 100;
                    const earn = runnerEarningsFromOrder(order);
                    const stars = order.rating ?? order.runnerRating;
                    const flagged =
                      order.adminVerified && order.customerNameOnReceipt === false;
                    const fpsMethod = order.runnerPaymentMethod ?? "PayMe / FPS";
                    const fpsId = order.runnerPaymentId?.trim();
                    return (
                      <li
                        key={order.id}
                        className={`rounded-2xl border p-4 ${
                          flagged ? "border-amber-400 bg-amber-50" : "border-gray-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="flex flex-wrap items-center gap-2 font-bold text-gray-900">
                              {order.id}
                              <OrderChannelBadge order={order} />
                            </p>
                            <p className="text-xs text-gray-500">
                              {order.runnerName ?? "Runner"} ·{" "}
                              {adminPayoutLabel(order.status)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Customer: {order.customerName ?? order.customerId}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-[#ED1C24]">
                              Pay runner ${payTotal}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Runner keep ~${earn}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl border-2 border-[#552583]/30 bg-[#552583]/5 px-3 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-[#552583]">
                            Runner {fpsMethod} / payment ID
                          </p>
                          <p className="mt-1 break-all text-lg font-extrabold text-gray-900">
                            {fpsId || "— ID missing on order —"}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-600">
                            {order.runnerName ?? "Runner"}
                            {order.runnerEmail ? ` · ${order.runnerEmail}` : ""}
                          </p>
                        </div>

                        <p className="mt-2 text-sm text-gray-700">
                          Spent at Fusion: ${spent} · Delivery fee: ${order.deliveryFee}
                          {tips > 0 ? ` · Tips: $${tips}` : ""}
                        </p>
                        {(stars || order.feedback || (order.tipAmount ?? 0) > 0) && (
                          <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm">
                            {stars ? (
                              <p className="font-semibold text-amber-900">
                                Rating: {stars}/5
                              </p>
                            ) : null}
                            {order.feedback ? (
                              <p className="mt-0.5 text-gray-800">{order.feedback}</p>
                            ) : null}
                            {(order.tipAmount ?? 0) > 0 ? (
                              <p className="mt-0.5 text-xs font-semibold text-emerald-800">
                                After-delivery tip HK${order.tipAmount}
                              </p>
                            ) : null}
                          </div>
                        )}
                        {flagged && (
                          <p className="mt-2 text-xs font-semibold text-amber-800">
                            Flagged: customer name not confirmed on the receipt.
                          </p>
                        )}
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <Proof url={order.receiptUrl} label="Receipt" />
                          <Proof url={order.bankStatementUrl} label="Bank statement" />
                        </div>
                        {(order.status === "paid" || order.status === "customer_paid") && (
                          <>
                            <label className="mt-3 flex items-start gap-2 text-xs font-semibold text-gray-800">
                              <input
                                type="checkbox"
                                checked={Boolean(nameOk[order.id] ?? order.customerNameOnReceipt)}
                                onChange={(e) =>
                                  setNameOk((prev) => ({
                                    ...prev,
                                    [order.id]: e.target.checked,
                                  }))
                                }
                                className="mt-0.5 h-4 w-4 accent-[#ED1C24]"
                              />
                              Customer name written on receipt?
                            </label>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                              <button
                                type="button"
                                disabled={saving === order.id}
                                onClick={() => void verify(order)}
                                className="flex-1 rounded-xl border-2 border-[#ED1C24] py-2.5 text-sm font-semibold text-[#ED1C24] disabled:opacity-60"
                              >
                                {order.adminVerified ? "Verified" : "Verify"}
                              </button>
                              <a
                                href={`#pay-${order.id}`}
                                className="flex-1 rounded-xl bg-[#552583] py-2.5 text-center text-sm font-semibold text-white"
                                onClick={(e) => {
                                  e.preventDefault();
                                  document
                                    .getElementById(`pay-${order.id}`)
                                    ?.scrollIntoView({ behavior: "smooth" });
                                }}
                              >
                                Pay Runner
                              </a>
                            </div>
                            <div
                              id={`pay-${order.id}`}
                              className="mt-3 rounded-xl bg-gray-50 px-3 py-3 text-sm"
                            >
                              <p className="font-semibold text-gray-900">
                                Send ${payTotal} via {fpsMethod}
                              </p>
                              <p className="mt-1 break-all font-mono text-base font-bold text-[#552583]">
                                {fpsId || "Payment ID missing"}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                Groceries ${spent} + delivery ${order.deliveryFee}
                                {tips > 0 ? ` + tips $${tips}` : ""}
                              </p>

                              <label className="mt-3 block text-xs font-semibold text-gray-800">
                                Upload bank statement / transfer proof (image or PDF)
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="mt-1 block w-full text-xs"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    setProofFiles((prev) => ({
                                      ...prev,
                                      [order.id]: file,
                                    }));
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              {proofFiles[order.id] ? (
                                <p className="mt-1 text-xs text-green-700">
                                  Ready: {proofFiles[order.id]?.name}
                                </p>
                              ) : order.runnerPayoutProofUrl ? (
                                <p className="mt-1 text-xs text-gray-500">
                                  Existing proof on file.
                                </p>
                              ) : null}

                              <button
                                type="button"
                                disabled={saving === order.id || !order.adminVerified}
                                onClick={() => void payRunner(order)}
                                className="mt-3 w-full rounded-xl bg-[#ED1C24] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                              >
                                {saving === order.id
                                  ? "Saving…"
                                  : "Mark as Paid"}
                              </button>
                              {!order.adminVerified && (
                                <p className="mt-1 text-[11px] text-gray-500">
                                  Verify the receipt first.
                                </p>
                              )}
                            </div>
                          </>
                        )}
                        {order.runnerPayoutProofUrl && (
                          <div className="mt-3">
                            <Proof
                              url={order.runnerPayoutProofUrl}
                              label="Admin → runner payment proof"
                            />
                          </div>
                        )}
                        {(order.status === "runner_paid" ||
                          order.status === "completed") && (
                          <p className="mt-3 text-xs text-green-700">
                            Runner reimbursed
                            {order.runnerPaidAt
                              ? ` · ${order.runnerPaidAt.toLocaleString("en-HK")}`
                              : ""}
                            .
                          </p>
                        )}
                        {order.status === "customer_paid" && (
                          <p className="mt-3 text-xs text-green-700">
                            Customer marked paid
                            {order.customerPaidAt
                              ? ` · ${order.customerPaidAt.toLocaleString("en-HK")}`
                              : ""}
                            .
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </main>
        </LakersWallpaper>
      </AppShell>
    </RequireAdmin>
  );
}
