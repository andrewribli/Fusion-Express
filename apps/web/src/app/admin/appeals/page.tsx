"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAdmin } from "@/components/RequireAdmin";
import { getAuthClient } from "@/lib/firebase";

type AppealRow = {
  uid: string;
  name: string;
  email: string;
  currentCollege: string;
  requestedCollege: string;
  reason: string;
  submittedAt: string;
};

export default function AdminAppealsPage() {
  const [rows, setRows] = useState<AppealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyUid, setBusyUid] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const token = await getAuthClient().currentUser?.getIdToken();
    if (!token) throw new Error("Sign in again as an admin.");
    const res = await fetch("/api/admin/college-appeals", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as { error?: string; appeals?: AppealRow[] };
    if (!res.ok) throw new Error(data.error || "Could not load appeals.");
    setRows(data.appeals ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load appeals.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function decide(uid: string, action: "approve" | "reject") {
    setBusyUid(uid);
    setError("");
    setMessage("");
    try {
      const token = await getAuthClient().currentUser?.getIdToken();
      if (!token) throw new Error("Sign in again as an admin.");
      const res = await fetch("/api/admin/college-appeals", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid, action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not update the appeal.");
      setMessage(action === "approve" ? "Appeal approved." : "Appeal rejected.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the appeal.");
    } finally {
      setBusyUid("");
    }
  }

  return (
    <RequireAdmin>
      <AppShell hideNav>
        <LakersWallpaper>
          <AppHeader showBack backHref="/admin/users" title="College appeals" />
          <main className="mx-auto max-w-5xl px-4 py-6">
            <div className="rounded-2xl bg-white/95 p-4 shadow-sm sm:p-6">
              <h1 className="text-xl font-bold text-gray-900">College appeals</h1>
              <p className="mt-1 text-sm text-gray-500">
                Pending CUHK runner college changes. Approving updates the locked
                college. Rejecting keeps the original.
              </p>
              <p className="mt-3 text-sm">
                <Link href="/admin/users" className="font-medium text-[#ED1C24] underline">
                  Back to users
                </Link>
              </p>
              {message && (
                <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
                  {message}
                </p>
              )}
              {error && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}
              {loading ? (
                <p className="mt-4 text-sm text-gray-500">Loading…</p>
              ) : rows.length === 0 ? (
                <p className="mt-6 text-sm text-gray-600">No pending appeals.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {rows.map((row) => (
                    <li key={row.uid} className="rounded-2xl border border-gray-100 p-4">
                      <p className="font-semibold text-gray-900">{row.name}</p>
                      <p className="text-xs text-gray-500">{row.email}</p>
                      <p className="mt-2 text-sm text-gray-800">
                        {row.currentCollege || "Unset"} → {row.requestedCollege}
                      </p>
                      <p className="mt-2 text-sm text-gray-700">{row.reason}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(row.submittedAt).toLocaleString("en-HK")}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={busyUid === row.uid}
                          onClick={() => void decide(row.uid, "approve")}
                          className="rounded-xl bg-[#ED1C24] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyUid === row.uid}
                          onClick={() => void decide(row.uid, "reject")}
                          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
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
