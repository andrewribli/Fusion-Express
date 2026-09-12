"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAdmin } from "@/components/RequireAdmin";
import {
  fetchAllFeedback,
  updateFeedbackStatus,
  type FeedbackItem,
  type FeedbackStatus,
} from "@/lib/feedback";

function formatWhen(date: Date): string {
  return date.toLocaleString("en-HK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const STATUSES: FeedbackStatus[] = ["unread", "read", "resolved"];

export default function AdminFeedbackPage() {
  const [rows, setRows] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    const next = await fetchAllFeedback();
    setRows(next);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load feedback.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function setStatus(item: FeedbackItem, status: FeedbackStatus) {
    setSaving(item.id);
    setError("");
    try {
      await updateFeedbackStatus(item.id, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <RequireAdmin>
      <AppShell hideNav>
        <LakersWallpaper>
          <AppHeader showBack backHref="/admin/users" title="Feedback" />
          <main className="mx-auto max-w-3xl px-4 py-6">
            <div className="rounded-2xl bg-white/95 p-4 shadow-sm sm:p-6">
              <h1 className="text-xl font-bold text-gray-900">Feedback</h1>
              <p className="mt-1 text-sm text-gray-500">
                {loading
                  ? "Loading…"
                  : `${rows.length} note${rows.length === 1 ? "" : "s"}`}
              </p>
              <p className="mt-2 text-sm">
                <Link href="/admin/users" className="font-medium text-[#ED1C24] underline">
                  Users
                </Link>
                {" · "}
                <Link href="/admin/payouts" className="font-medium text-[#ED1C24] underline">
                  Runner payouts
                </Link>
                {" · "}
                <Link href="/admin/refunds" className="font-medium text-[#ED1C24] underline">
                  Refunds
                </Link>
              </p>

              {error && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <ul className="mt-5 space-y-3">
                {rows.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {item.userName?.trim() || "Anonymous"}
                        </p>
                        <p className="text-xs text-gray-500">{formatWhen(item.createdAt)}</p>
                      </div>
                      <select
                        value={item.status}
                        disabled={saving === item.id}
                        onChange={(e) =>
                          void setStatus(item, e.target.value as FeedbackStatus)
                        }
                        className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold capitalize text-gray-800"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800">
                      {item.message}
                    </p>
                  </li>
                ))}
              </ul>

              {!loading && rows.length === 0 && (
                <p className="mt-6 text-sm text-gray-500">No feedback yet.</p>
              )}
            </div>
          </main>
        </LakersWallpaper>
      </AppShell>
    </RequireAdmin>
  );
}
