"use client";

import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAuth } from "@/components/RequireAuth";
import { AdminChatPanel } from "@/components/AdminChatPanel";
import { isAdminUnlocked, lockAdmin, unlockAdmin } from "@/lib/admin";
import {
  notifyAdminThreadActivity,
  requestNotificationPermission,
} from "@/lib/notifications";
import {
  ADMIN_SENDER_ID,
  ADMIN_SENDER_NAME,
  subscribeAdminThreads,
  type AdminChatThread,
} from "@/lib/admin-chat";

function AdminGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (unlockAdmin(pin)) {
      onUnlock();
    } else {
      setError("Incorrect PIN");
    }
  }

  return (
    <main className="mx-auto max-w-[480px] px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white/95 p-6 shadow-lg ring-2 ring-lakers-gold"
      >
        <h1 className="text-xl font-bold text-gray-900">GraceRun Admin</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter the admin PIN to manage order chats.
        </p>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Admin PIN"
          className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-fusion-red focus:outline-none focus:ring-2 focus:ring-fusion-red/20"
        />
        {error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="mt-4 w-full rounded-xl bg-fusion-red py-3 text-sm font-semibold text-white"
        >
          Unlock
        </button>
      </form>
    </main>
  );
}

function ThreadList({
  threads,
  onSelect,
}: {
  threads: AdminChatThread[];
  onSelect: (thread: AdminChatThread) => void;
}) {
  if (threads.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-3xl">💬</p>
        <p className="mt-3 text-sm text-gray-600">No order chats yet.</p>
        <p className="mt-1 text-xs text-gray-400">
          Customer and runner messages will appear here.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {threads.map((thread) => {
        const who = thread.party === "customer" ? "Customer" : "Runner";
        const hasUnread = thread.adminUnread > 0;
        return (
          <li key={thread.id}>
            <button
              type="button"
              onClick={() => onSelect(thread)}
              className={`flex w-full items-center justify-between rounded-2xl border bg-white p-4 text-left shadow-sm ${
                hasUnread ? "border-fusion-red" : "border-gray-100"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">
                    {thread.orderId}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      thread.party === "customer"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {who}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-gray-500">
                  {thread.lastSenderRole === "admin" ? "You: " : ""}
                  {thread.lastMessage || "—"}
                </p>
              </div>
              {hasUnread && (
                <span className="ml-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-fusion-red px-1.5 text-xs font-bold text-white">
                  {thread.adminUnread > 9 ? "9+" : thread.adminUnread}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AdminDashboard() {
  const [threads, setThreads] = useState<AdminChatThread[]>([]);
  const [selected, setSelected] = useState<AdminChatThread | null>(null);
  const seenRef = useRef<Map<string, number> | null>(null);

  useEffect(() => {
    void requestNotificationPermission();
    return subscribeAdminThreads((next) => {
      setThreads(next);
      const seen = seenRef.current;
      if (seen === null) {
        // Seed silently on the first snapshot so we don't alert for history.
        seenRef.current = new Map(next.map((t) => [t.id, t.updatedAt.getTime()]));
        return;
      }
      for (const t of next) {
        const prev = seen.get(t.id) ?? 0;
        if (t.updatedAt.getTime() > prev && t.lastSenderRole !== "admin") {
          notifyAdminThreadActivity(t);
        }
        seen.set(t.id, t.updatedAt.getTime());
      }
    });
  }, []);

  const totalUnread = threads.reduce((sum, t) => sum + t.adminUnread, 0);

  const current =
    selected && threads.find((t) => t.id === selected.id)
      ? threads.find((t) => t.id === selected.id)!
      : selected;

  return (
    <main className="mx-auto max-w-[480px] px-4 py-4">
      {current ? (
        <div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mb-3 text-sm font-semibold text-lakers-gold"
          >
            ← All chats
          </button>
          <AdminChatPanel
            key={current.id}
            orderId={current.orderId}
            party={current.party}
            viewerRole="admin"
            viewerId={ADMIN_SENDER_ID}
            viewerName={ADMIN_SENDER_NAME}
            partyUserId={current.participants.find((p) => p !== ADMIN_SENDER_ID)}
            title={`${current.orderId} · ${
              current.party === "customer" ? "Customer" : "Runner"
            }`}
            subtitle="You are replying as GraceRun"
          />
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Order chats</p>
              <p className="text-xs text-white/60">
                {totalUnread > 0
                  ? `${totalUnread} unread message${totalUnread === 1 ? "" : "s"}`
                  : "All caught up"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                lockAdmin();
                window.location.reload();
              }}
              className="rounded-lg border border-white/30 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Lock
            </button>
          </div>
          <ThreadList threads={threads} onSelect={setSelected} />
        </>
      )}
    </main>
  );
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUnlocked(isAdminUnlocked());
    setReady(true);
  }, []);

  return (
    <RequireAuth>
      <AppShell>
        <LakersWallpaper>
          <AppHeader title="Admin" />
          {!ready ? (
            <p className="p-4 text-sm text-lakers-gold">Loading…</p>
          ) : unlocked ? (
            <AdminDashboard />
          ) : (
            <AdminGate onUnlock={() => setUnlocked(true)} />
          )}
        </LakersWallpaper>
      </AppShell>
    </RequireAuth>
  );
}
