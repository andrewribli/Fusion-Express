"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAdmin } from "@/components/RequireAdmin";
import { sendBroadcast } from "@/lib/admin-broadcast";

const AUDIENCES = [
  { id: "all", label: "All users" },
  { id: "customers", label: "Customers only" },
  { id: "runners", label: "Runners only" },
  { id: "cuhk", label: "CUHK only" },
  { id: "cityu", label: "CityU only" },
] as const;

export default function AdminBroadcastPage() {
  return (
    <RequireAdmin>
      <AdminBroadcast />
    </RequireAdmin>
  );
}

function AdminBroadcast() {
  const [audience, setAudience] =
    useState<(typeof AUDIENCES)[number]["id"]>("all");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function onSend() {
    setSending(true);
    setError("");
    setStatus("");
    try {
      const result = await sendBroadcast({
        group: "everyone",
        subject: "Message from GraceRun",
        body: message,
        audience,
      });
      setStatus(
        `Broadcast sent. In-app + email to ${result.sent ?? result.count ?? 0}` +
          (result.queued ? ` (${result.queued} emails queued for rate limits)` : "") +
          ".",
      );
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell hideNav>
      <LakersWallpaper>
        <AppHeader showBack backHref="/admin/users" title="Broadcast" />
        <main className="mx-auto max-w-xl px-4 py-6">
          <div className="rounded-2xl bg-white/95 p-4 shadow-sm sm:p-6">
            <h1 className="text-xl font-bold text-gray-900">Admin broadcast</h1>
            <p className="mt-1 text-sm text-gray-500">
              Delivers an in-app notification immediately and emails via Resend
              (rate-limited). Logged to{" "}
              <code className="text-xs">adminBroadcasts</code>.
            </p>
            <p className="mt-2 text-sm">
              <Link
                href="/admin/chats"
                className="font-medium text-[#ED1C24] underline"
              >
                1:1 chats
              </Link>
              {" · "}
              <Link
                href="/admin/users"
                className="font-medium text-[#ED1C24] underline"
              >
                Users
              </Link>
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {AUDIENCES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAudience(item.id)}
                  className={`min-h-11 rounded-full px-3 py-2 text-xs font-semibold ${
                    audience === item.id
                      ? "bg-[#ED1C24] text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-4 min-h-36 w-full rounded-xl border border-gray-200 px-3 py-3 text-sm"
              placeholder="Message to everyone…"
              maxLength={2000}
            />

            <button
              type="button"
              disabled={sending || !message.trim()}
              onClick={() => void onSend()}
              className="mt-4 min-h-11 w-full rounded-xl bg-[#111827] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send"}
            </button>

            {status ? (
              <p className="mt-3 text-sm text-green-700">{status}</p>
            ) : null}
            {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          </div>
        </main>
      </LakersWallpaper>
    </AppShell>
  );
}
