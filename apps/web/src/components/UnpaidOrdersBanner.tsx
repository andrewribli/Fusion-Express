"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser, getUserAccountId } from "@/context/UserContext";
import {
  customerAmountDue,
  isCustomerPaymentOpen,
} from "@/lib/order-status";
import { fetchOrdersByCustomer } from "@/lib/orders";
import type { Order } from "@/lib/types";

/**
 * Aggressive chase banner for delivered/unpaid orders — guests included.
 * Mount on home + orders so pay-up + track are impossible to miss.
 */
export function UnpaidOrdersBanner({
  tone = "light",
}: {
  tone?: "light" | "dark";
}) {
  const { user } = useUser();
  const [unpaid, setUnpaid] = useState<Order[]>([]);

  useEffect(() => {
    if (!user?.uid) {
      setUnpaid([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const accountId = getUserAccountId(user);
        const mine = await fetchOrdersByCustomer(accountId);
        if (cancelled) return;
        setUnpaid(
          mine.filter(
            (o) =>
              o.customerId === accountId &&
              !o.paymentReceived &&
              isCustomerPaymentOpen(o.status, o),
          ),
        );
      } catch {
        if (!cancelled) setUnpaid([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (unpaid.length === 0) return null;

  const totalDue = unpaid.reduce((sum, o) => sum + customerAmountDue(o), 0);
  const primary = unpaid[0];
  const surface =
    tone === "dark"
      ? "border-amber-400/40 bg-amber-500/15 text-amber-50"
      : "border-amber-300 bg-amber-50 text-amber-950";

  return (
    <div className={`mx-auto max-w-3xl px-4 pt-3`}>
      <div className={`rounded-2xl border px-4 py-3 shadow-sm ${surface}`}>
        <p className="text-sm font-extrabold">
          Payment owed
          {unpaid.length > 1 ? ` · ${unpaid.length} orders` : ""} · $
          {totalDue.toFixed(1)}
        </p>
        <p className={`mt-1 text-xs ${tone === "dark" ? "text-amber-100/90" : "text-amber-900/80"}`}>
          {primary.hall ? `${primary.hall} · ` : ""}
          Order {primary.id.slice(0, 8)}… was delivered. Pay GraceRun now —
          email/push may not reach guest accounts.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/pay/${encodeURIComponent(primary.id)}`}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#ED1C24] px-4 text-xs font-bold text-white"
          >
            Pay now
          </Link>
          <Link
            href={`/track?orderId=${encodeURIComponent(primary.id)}`}
            className={`inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-xs font-bold ${
              tone === "dark"
                ? "border-white/30 text-white"
                : "border-amber-400 text-amber-950"
            }`}
          >
            Track / details
          </Link>
          <Link
            href="/?chat=1"
            className={`inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-xs font-bold ${
              tone === "dark"
                ? "border-white/30 text-white"
                : "border-amber-400 text-amber-950"
            }`}
          >
            Admin chat
          </Link>
          {unpaid.length > 1 && (
            <Link
              href="/orders"
              className={`inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-xs font-semibold underline ${
                tone === "dark" ? "text-white" : "text-amber-950"
              }`}
            >
              All unpaid
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
