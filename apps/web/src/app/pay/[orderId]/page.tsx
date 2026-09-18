"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { FileDropzone } from "@/components/FileDropzone";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAuth } from "@/components/RequireAuth";
import { useUser, getUserAccountId } from "@/context/UserContext";
import { compressImage } from "@/lib/compress-image";
import { fetchOrder } from "@/lib/orders";
import { customerAmountDue } from "@/lib/order-status";
import { ownerPaymentDetails } from "@/lib/owner-payment";
import {
  fetchPaymentSubmissionForOrder,
  submitPaymentProof,
  uploadPaymentScreenshot,
  type PaymentSubmission,
} from "@/lib/payment-submissions";
import type { Order } from "@/lib/types";

export default function SubmitPaymentPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId: rawId } = use(params);
  const orderId = decodeURIComponent(rawId ?? "");
  const { user } = useUser();
  const [order, setOrder] = useState<Order | null>(null);
  const [existing, setExisting] = useState<PaymentSubmission | null>(null);
  const [file, setFile] = useState<File | undefined>();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!orderId || !user?.uid) return;
      try {
        const found = await fetchOrder(orderId);
        const sub = await fetchPaymentSubmissionForOrder(orderId, user.uid);
        if (!cancelled) {
          setOrder(found);
          setExisting(sub);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load order.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, user?.uid]);

  const owner = ownerPaymentDetails();
  const due = order ? customerAmountDue(order) : 0;
  const mine = Boolean(
    user && order && getUserAccountId(user) === order.customerId,
  );
  const payable =
    order &&
    (order.status === "delivered" || order.status === "runner_paid");
  const pending = existing?.status === "pending";
  const confirmed = existing?.status === "confirmed" || order?.status === "customer_paid";

  async function submit() {
    if (!user?.uid || !order || !file) {
      setError("Upload a screenshot of your PayMe or FPS transfer.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const compressed = await compressImage(file);
      const screenshotUrl = await uploadPaymentScreenshot(
        user.uid,
        order.id,
        compressed,
        compressed.name,
      );
      const saved = await submitPaymentProof({
        orderId: order.id,
        userId: user.uid,
        screenshotUrl,
        note,
      });
      setExisting(saved);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit payment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <AppShell>
        <LakersWallpaper>
          <AppHeader showBack backHref={`/track?orderId=${orderId}`} title="Submit Payment" />
          <main className="mx-auto max-w-[480px] px-4 py-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              {loading ? (
                <p className="text-sm text-gray-500">Loading…</p>
              ) : !order || !mine ? (
                <p className="text-sm text-gray-600">
                  We could not find that order on your account.
                </p>
              ) : confirmed ? (
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Payment received</h1>
                  <p className="mt-2 text-sm text-gray-600">
                    GraceRun has confirmed payment for this order. Thank you.
                  </p>
                  <Link
                    href={`/track?orderId=${order.id}`}
                    className="mt-4 inline-block font-semibold text-[#ED1C24] underline"
                  >
                    Back to order
                  </Link>
                </div>
              ) : pending || done ? (
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Submitted</h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Your transfer screenshot is with GraceRun. We will confirm
                    payment after review.
                  </p>
                  {existing?.screenshotUrl && !existing.screenshotUrl.startsWith("mock://") && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={existing.screenshotUrl}
                      alt="Payment screenshot"
                      className="mt-3 max-h-56 w-full rounded-xl object-contain bg-gray-50"
                    />
                  )}
                </div>
              ) : !payable ? (
                <p className="text-sm text-gray-600">
                  Payment opens after your order is delivered.
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">Submit Payment</h1>
                    <p className="mt-1 text-sm text-gray-600">
                      Send {owner.method}
                      {owner.id ? ` to ${owner.id}` : ""} then upload the
                      screenshot. Order {order.id}.
                    </p>
                    <p className="mt-3 text-3xl font-bold text-[#ED1C24]">${due}</p>
                  </div>
                  {existing?.status === "rejected" && (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      The last screenshot was not accepted. Please upload a
                      clearer PayMe or FPS receipt and submit again.
                    </p>
                  )}
                  <FileDropzone
                    label="Transfer screenshot"
                    hint="Tap to take or choose a photo of your PayMe / FPS receipt"
                    file={file}
                    busy={saving}
                    onFile={setFile}
                  />
                  <label className="block text-sm">
                    <span className="font-semibold text-gray-800">Note (optional)</span>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Reference number, name on the transfer…"
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#ED1C24] focus:outline-none"
                    />
                  </label>
                  {error && (
                    <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void submit()}
                    className="w-full rounded-xl bg-[#ED1C24] py-3 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {saving ? "Submitting…" : "Submit Payment"}
                  </button>
                </div>
              )}
            </div>
          </main>
        </LakersWallpaper>
      </AppShell>
    </RequireAuth>
  );
}
