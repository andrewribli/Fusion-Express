"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAdmin } from "@/components/RequireAdmin";
import { formatDeliveryAddress } from "@/data/cuhk-locations";
import {
  fetchOrdersNeedingRefund,
  markRefundComplete,
} from "@/lib/orders";
import type { Order } from "@/lib/types";

export default function AdminRefundsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setError("");
    const rows = await fetchOrdersNeedingRefund();
    setOrders(rows);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load refunds.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function complete(orderId: string) {
    setSaving(orderId);
    try {
      await markRefundComplete(orderId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark refund.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <RequireAdmin>
      <AppShell hideNav>
        <LakersWallpaper>
          <AppHeader showBack backHref="/admin/users" title="Refunds" />
          <main className="mx-auto max-w-3xl px-4 py-6">
            <div className="rounded-2xl bg-white/95 p-4 shadow-sm sm:p-6">
              <h1 className="text-xl font-bold text-gray-900">Manual refunds</h1>
              <p className="mt-1 text-sm text-gray-500">
                Pay the customer the listed amount via PayMe or FPS, then mark complete.
              </p>
              <p className="mt-2 text-xs">
                <Link href="/admin/users" className="font-medium text-[#ED1C24] underline">
                  Users
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
              ) : orders.length === 0 ? (
                <p className="mt-6 text-sm text-gray-600">No pending refunds.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {orders.map((order) => (
                    <li
                      key={order.id}
                      className="rounded-xl border border-gray-100 p-4 text-sm"
                    >
                      <div className="flex justify-between gap-3">
                        <p className="font-bold text-gray-900">{order.id}</p>
                        <p className="font-semibold text-green-700">
                          Refund ${order.refundAmount}
                        </p>
                      </div>
                      <p className="mt-1 text-gray-700">{order.customerName}</p>
                      <p className="text-xs text-gray-500">
                        {formatDeliveryAddress(order.college, order.hall)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Estimate ${order.estimatedSubtotal ?? order.subtotal + (order.refundAmount ?? 0)}{" "}
                        → Fusion ${order.actualSubtotal}
                      </p>
                      <button
                        type="button"
                        disabled={saving === order.id}
                        onClick={() => void complete(order.id)}
                        className="mt-3 w-full rounded-xl bg-[#ED1C24] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {saving === order.id
                          ? "Saving…"
                          : "Mark PayMe/FPS refund complete"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </main>
        </LakersWallpaper>
      </AppShell>
    </RequireAdmin>
  );
}
