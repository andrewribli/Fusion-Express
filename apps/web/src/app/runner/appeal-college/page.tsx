"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAuth } from "@/components/RequireAuth";
import { RunnerCollegeSelect } from "@/components/RunnerCollegeSelect";
import { useUser } from "@/context/UserContext";
import { getAuthClient } from "@/lib/firebase";
import { runnerCollegeLabel } from "@fusion-express/shared/college-discount";

export default function AppealCollegePage() {
  const { user } = useUser();
  const [requestedCollege, setRequestedCollege] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (reason.trim().length < 20) {
      setError("Tell us why in at least 20 characters.");
      return;
    }
    setLoading(true);
    try {
      const token = await getAuthClient().currentUser?.getIdToken();
      if (!token) throw new Error("Sign in again to submit an appeal.");
      const res = await fetch("/api/runner/college-appeal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestedCollege, reason }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || "Could not submit appeal.");
      setMessage(data.message || "Appeal submitted. We'll review within 3 business days.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit appeal.");
    } finally {
      setLoading(false);
    }
  }

  const current = runnerCollegeLabel(user?.runnerCollege);

  return (
    <RequireAuth>
      <AppShell>
        <LakersWallpaper>
          <AppHeader showBack backHref="/profile" title="Appeal college" />
          <main className="mx-auto max-w-[480px] px-4 py-6">
            <form
              onSubmit={(event) => void submit(event)}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <h1 className="text-xl font-bold text-gray-900">Appeal college</h1>
              <p className="mt-2 text-sm text-gray-600">
                Your college is {current || "not set"}. An approved appeal is the
                only way to change it. GraceRun reviews appeals within 3 business
                days.
              </p>
              <div className="mt-4">
                <RunnerCollegeSelect
                  id="appeal-college"
                  value={requestedCollege}
                  onChange={setRequestedCollege}
                />
              </div>
              <label htmlFor="appeal-reason" className="mt-4 block text-xs font-medium text-gray-600">
                Why should this change?
              </label>
              <textarea
                id="appeal-reason"
                required
                minLength={20}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={5}
                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900"
                placeholder="At least 20 characters"
              />
              {error && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}
              {message && (
                <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
                  {message}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || !requestedCollege}
                className="mt-4 w-full rounded-xl bg-[#ED1C24] py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? "Submitting…" : "Submit appeal"}
              </button>
              <p className="mt-3 text-center text-xs text-gray-500">
                Or email <Link href="mailto:hello@gracerun.fit" className="underline">hello@gracerun.fit</Link>
              </p>
            </form>
          </main>
        </LakersWallpaper>
      </AppShell>
    </RequireAuth>
  );
}
