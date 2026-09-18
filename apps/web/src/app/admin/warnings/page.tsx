"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAdmin } from "@/components/RequireAdmin";
import {
  escalateDeadlineWarning,
  fetchDeadlineWatchOrders,
  syncOrderDeadlines,
} from "@/lib/orders";
import { notifyDeadlineEvent } from "@/lib/notify-email";
import { useDeadlineWatch } from "@/lib/use-deadline-watch";
import type { Order } from "@/lib/types";

function formatWhen(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleString("en-HK", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminWarningsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setError("");
    const rows = await fetchDeadlineWatchOrders();
    for (const row of rows) {
      await syncOrderDeadlines(row);
    }
    const fresh = await fetchDeadlineWatchOrders();
    setOrders(fresh);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load warnings.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useDeadlineWatch(orders);

  const runnerRows = orders.filter(
    (order) => order.runnerExpiredAt || (order.runnerWarningCount ?? 0) > 0,
  );
  const customerRows = orders.filter(
    (order) => order.customerOverdueAt || (order.customerWarningCount ?? 0) > 0,
  );

  async function escalate(order: Order, party: "runner" | "customer") {
    setSaving(`${order.id}-${party}`);
    try {
      await escalateDeadlineWarning(order.id, party);
      const email =
        party === "runner" ? order.runnerEmail : order.customerEmail;
      await notifyDeadlineEvent({
        kind: party === "runner" ? "escalate_runner" : "escalate_customer",
        orderId: order.id,
        email,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not escalate.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <RequireAdmin>
      <AppShell hideNav>
        <LakersWallpaper>
          <AppHeader showBack backHref="/admin/users" title="Warnings" />
          <main className="mx-auto max-w-3xl px-4 py-6">
            <div className="rounded-2xl bg-white/95 p-4 shadow-sm sm:p-6">
              <h1 className="text-xl font-bold text-gray-900">
                Disciplinary warnings
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Missed 3-hour runner deliveries and 24-hour customer payments.
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
                <Link href="/admin/payouts" className="font-medium text-[#ED1C24] underline">
                  Payouts
                </Link>
                {" · "}
                <Link href="/admin/feedback" className="font-medium text-[#ED1C24] underline">
                  Feedback
                </Link>
              </p>
              {error && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}
              {loading ? (
                <p className="mt-4 text-sm text-gray-500">Loading…</p>
              ) : (
                <div className="mt-6 space-y-8">
                  <section>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-[#ED1C24]">
                      Runner
                    </h2>
                    {runnerRows.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">No runner warnings.</p>
                    ) : (
                      <ul className="mt-3 space-y-3">
                        {runnerRows.map((order) => (
                          <li
                            key={`r-${order.id}`}
                            className="rounded-2xl border border-gray-100 bg-white p-4"
                          >
                            <p className="font-bold text-gray-900">{order.id}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {order.runnerName ?? "Runner"} · expired{" "}
                              {formatWhen(order.runnerExpiredAt)} · warnings{" "}
                              {order.runnerWarningCount ?? 0}
                            </p>
                            <button
                              type="button"
                              disabled={saving === `${order.id}-runner`}
                              onClick={() => void escalate(order, "runner")}
                              className="mt-3 min-h-11 rounded-xl bg-[#ED1C24] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                            >
                              {saving === `${order.id}-runner`
                                ? "Sending…"
                                : "Escalate"}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-[#ED1C24]">
                      Customer
                    </h2>
                    {customerRows.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">
                        No customer warnings.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-3">
                        {customerRows.map((order) => (
                          <li
                            key={`c-${order.id}`}
                            className="rounded-2xl border border-gray-100 bg-white p-4"
                          >
                            <p className="font-bold text-gray-900">{order.id}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {order.customerName ?? "Customer"} · overdue{" "}
                              {formatWhen(order.customerOverdueAt)} · warnings{" "}
                              {order.customerWarningCount ?? 0}
                            </p>
                            <button
                              type="button"
                              disabled={saving === `${order.id}-customer`}
                              onClick={() => void escalate(order, "customer")}
                              className="mt-3 min-h-11 rounded-xl bg-[#ED1C24] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                            >
                              {saving === `${order.id}-customer`
                                ? "Sending…"
                                : "Escalate"}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              )}
            </div>
          </main>
        </LakersWallpaper>
      </AppShell>
    </RequireAdmin>
  );
}
