"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAdmin } from "@/components/RequireAdmin";
import {
  previewBroadcastCount,
  sendBroadcast,
  type BroadcastGroup,
} from "@/lib/admin-broadcast";

type GroupConfig = {
  id: BroadcastGroup;
  title: string;
  description: string;
  defaultSubject: string;
  defaultBody: string;
};

const GROUPS: GroupConfig[] = [
  {
    id: "new_users",
    title: "New Users",
    description: "Registered in the last 7 days",
    defaultSubject: "Welcome to GraceRun!",
    defaultBody:
      "Hey! Saw you just made an account. Welcome to GraceRun! Ready to skip the hill? Order your groceries now and get free delivery on your first order. Just reply to this email or order at gracerun.fit",
  },
  {
    id: "runners",
    title: "Runners",
    description: "Users with isRunner: true",
    defaultSubject: "Orders are waiting — GraceRun",
    defaultBody:
      "Hey runner! We've got orders coming in. Make sure you're ready to accept deliveries and earn some cash. Check the app for available orders.",
  },
  {
    id: "long_term",
    title: "Long-Term Users",
    description: "Registered more than 30 days ago",
    defaultSubject: "Missing GraceRun?",
    defaultBody:
      "Hey! It's been a while. Missing the convenience of GraceRun? Order today and we'll deliver straight to your dorm lobby. No hill. No queue. Just food.",
  },
];

function groupLabel(id: BroadcastGroup): string {
  return GROUPS.find((g) => g.id === id)?.title ?? id;
}

export default function AdminMessagingPage() {
  const [selected, setSelected] = useState<GroupConfig | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [failed, setFailed] = useState<{ email: string; error: string }[]>([]);
  const [sending, setSending] = useState(false);

  const openGroup = useCallback((group: GroupConfig) => {
    setSelected(group);
    setSubject(group.defaultSubject);
    setBody(group.defaultBody);
    setShowPreview(false);
    setStatus("");
    setError("");
    setFailed([]);
    setCount(null);
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setCountLoading(true);
    void (async () => {
      try {
        const n = await previewBroadcastCount(selected.id);
        if (!cancelled) {
          setCount(n);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setCount(null);
          setError(
            err instanceof Error ? err.message : "Could not load recipient count.",
          );
        }
      } finally {
        if (!cancelled) setCountLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  async function handleSend(test: boolean) {
    if (!selected) return;
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (!trimmedSubject || !trimmedBody) {
      setError("Subject and body are required.");
      return;
    }

    setSending(true);
    setError("");
    setFailed([]);
    setStatus(
      test
        ? "Sending test to yourself…"
        : `Sending to ${count ?? "…"} users…`,
    );

    try {
      const result = await sendBroadcast({
        group: selected.id,
        subject: trimmedSubject,
        body: trimmedBody,
        test,
      });

      if (test) {
        setStatus(`Test sent to ${result.to ?? "your inbox"} successfully.`);
      } else {
        const sent = result.sent ?? 0;
        const fails = result.failed ?? [];
        setFailed(fails);
        if (fails.length === 0) {
          setStatus(`Sent to ${sent} users successfully.`);
        } else {
          setStatus(
            `Sent to ${sent} of ${result.count ?? sent + fails.length} users. ${fails.length} failed.`,
          );
        }
      }
    } catch (err) {
      setStatus("");
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <RequireAdmin>
      <AppShell hideNav>
        <LakersWallpaper>
          <AppHeader showBack backHref="/admin/users" title="Messaging" />
          <main className="mx-auto max-w-3xl px-4 py-6">
            <div className="rounded-2xl bg-white/95 p-4 shadow-sm sm:p-6">
              <h1 className="text-xl font-bold text-gray-900">Messaging</h1>
              <p className="mt-1 text-sm text-gray-500">
                Email a user group from GraceRun &lt;hello@gracerun.fit&gt;.
                Replies go to andrew.ribli@gmail.com.
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
                <Link href="/admin/feedback" className="font-medium text-[#ED1C24] underline">
                  Feedback
                </Link>
              </p>

              {!selected ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {GROUPS.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => openGroup(group)}
                      className="rounded-2xl border border-gray-200 bg-white px-4 py-5 text-left transition hover:border-[#ED1C24]/40 hover:shadow-sm"
                    >
                      <p className="text-base font-bold text-gray-900">
                        {group.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {group.description}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {selected.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {countLoading
                          ? "Counting recipients…"
                          : count == null
                            ? selected.description
                            : `${count} recipient${count === 1 ? "" : "s"} · ${selected.description}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(null);
                        setShowPreview(false);
                        setStatus("");
                        setError("");
                        setFailed([]);
                      }}
                      className="text-sm font-medium text-[#ED1C24] underline"
                    >
                      Change group
                    </button>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Subject
                    </span>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={sending}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#ED1C24]"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Email body
                    </span>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      disabled={sending}
                      rows={8}
                      className="mt-1 w-full resize-y rounded-xl border border-gray-200 px-3 py-2.5 text-sm leading-relaxed text-gray-900 outline-none focus:border-[#ED1C24]"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPreview((v) => !v)}
                      disabled={sending}
                      className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {showPreview ? "Hide preview" : "Preview email"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSend(true)}
                      disabled={sending || !subject.trim() || !body.trim()}
                      className="rounded-xl border border-[#ED1C24]/30 bg-[#ED1C24]/5 px-4 py-2.5 text-sm font-semibold text-[#ED1C24] hover:bg-[#ED1C24]/10 disabled:opacity-50"
                    >
                      Send test to myself
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSend(false)}
                      disabled={
                        sending ||
                        countLoading ||
                        count === 0 ||
                        !subject.trim() ||
                        !body.trim()
                      }
                      className="rounded-xl bg-[#ED1C24] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#c9171e] disabled:opacity-50"
                    >
                      Send to {groupLabel(selected.id).toLowerCase()}
                    </button>
                  </div>

                  {showPreview && (
                    <div className="overflow-hidden rounded-2xl border border-gray-200">
                      <div className="bg-[#ED1C24] px-4 py-3">
                        <p className="text-base font-bold text-white">GraceRun</p>
                        <p className="text-xs text-[#ffd6d9]">
                          Groceries. Delivered with grace.
                        </p>
                      </div>
                      <div className="bg-white px-4 py-4">
                        <h2 className="text-lg font-bold text-gray-900">
                          {subject.trim() || "(no subject)"}
                        </h2>
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                          {body.trim() || "(empty body)"}
                        </div>
                      </div>
                      <div className="border-t border-gray-100 bg-white px-4 py-3">
                        <p className="text-xs text-gray-500">
                          Thanks for using GraceRun — groceries delivered with
                          grace.
                        </p>
                      </div>
                    </div>
                  )}

                  {status && (
                    <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
                      {status}
                    </p>
                  )}

                  {error && (
                    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </p>
                  )}

                  {failed.length > 0 && (
                    <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <p className="font-semibold">Failed emails</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {failed.map((f) => (
                          <li key={f.email}>
                            {f.email}: {f.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </LakersWallpaper>
      </AppShell>
    </RequireAdmin>
  );
}
