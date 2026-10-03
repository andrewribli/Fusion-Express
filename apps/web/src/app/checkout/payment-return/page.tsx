"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { fetchOrder } from "@/lib/orders";
import { getAuthClient, isFirebaseConfigured } from "@/lib/firebase";

async function confirmPayment(orderId: string): Promise<boolean> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (isFirebaseConfigured()) {
    const user = getAuthClient().currentUser;
    if (user) {
      try {
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
      } catch {
        /* ignore */
      }
    }
  }
  const res = await fetch("/api/payments/confirm", {
    method: "POST",
    headers,
    body: JSON.stringify({ orderId }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    paid?: boolean;
    alreadyPaid?: boolean;
  };
  return Boolean(data.paid || data.alreadyPaid);
}

function PaymentReturnInner() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("orderId")?.trim() ?? "";
  const guest = params.get("guest") === "1";
  const [message, setMessage] = useState("Confirming your payment…");

  useEffect(() => {
    if (!orderId) {
      setMessage("Missing order id.");
      return;
    }

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      try {
        if (attempts === 1 || attempts % 3 === 0) {
          await confirmPayment(orderId);
        }
        const order = await fetchOrder(orderId);
        if (cancelled) return;
        if (
          order &&
          (order.status === "paid" ||
            order.paymentReceived ||
            order.status === "accepted" ||
            order.status === "purchased" ||
            order.status === "delivered" ||
            order.status === "completed")
        ) {
          setMessage("Payment confirmed. Taking you to tracking…");
          const guestFlag = guest ? "&guest=1" : "";
          router.replace(`/track?orderId=${encodeURIComponent(orderId)}${guestFlag}`);
          return;
        }
      } catch (err) {
        console.error("payment-return poll failed", err);
      }

      if (attempts >= 15) {
        setMessage(
          "We're still confirming payment with Airwallex. You can open tracking — it will update when payment clears.",
        );
        return;
      }
      window.setTimeout(() => {
        void poll();
      }, 2000);
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [guest, orderId, router]);

  return (
    <main className="mx-auto max-w-[480px] px-4 py-10 text-center">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-gray-900">{message}</p>
        {orderId ? (
          <Link
            href={`/track?orderId=${encodeURIComponent(orderId)}${guest ? "&guest=1" : ""}`}
            className="mt-4 inline-block text-sm font-semibold text-fusion-red underline"
          >
            Open order tracking
          </Link>
        ) : (
          <Link href="/" className="mt-4 inline-block text-sm underline">
            Back home
          </Link>
        )}
      </div>
    </main>
  );
}

export default function PaymentReturnPage() {
  return (
    <AppShell>
      <LakersWallpaper>
        <AppHeader title="Payment" />
        <Suspense
          fallback={
            <main className="mx-auto max-w-[480px] px-4 py-10 text-center text-sm text-white/80">
              Loading…
            </main>
          }
        >
          <PaymentReturnInner />
        </Suspense>
      </LakersWallpaper>
    </AppShell>
  );
}
