"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAdmin } from "@/components/RequireAdmin";
import { useUser, type UserProfile } from "@/context/UserContext";
import {
  fetchDirectThreads,
  markThreadRead,
  sendDirectMessage,
  subscribeDirectMessages,
  type DirectMessage,
  type DirectThread,
} from "@/lib/direct-messages";
import { fetchAllUsers } from "@/lib/users";

function formatTime(date: Date): string {
  return date.toLocaleString("en-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSupportPage() {
  const { user } = useUser();
  const [threads, setThreads] = useState<DirectThread[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [rows, users] = await Promise.all([
          fetchDirectThreads(),
          fetchAllUsers()
            .then((result) => result.users)
            .catch(() => [] as UserProfile[]),
        ]);
        if (cancelled) return;
        setThreads(rows);
        const map: Record<string, string> = {};
        for (const u of users) {
          if (u.uid) map[u.uid] = u.fullName || u.email || u.uid;
        }
        setNames(map);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load chats.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const interval = setInterval(() => {
      void fetchDirectThreads().then(setThreads).catch(() => undefined);
    }, 12000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    return subscribeDirectMessages(selectedId, setMessages);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || !user?.uid) return;
    void markThreadRead({ userId: selectedId, readerId: user.uid });
  }, [selectedId, user?.uid, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedId]);

  async function reply(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.uid || !selectedId || !text.trim()) return;
    setSending(true);
    setError("");
    try {
      await sendDirectMessage({
        userId: selectedId,
        senderId: user.uid,
        message: text,
      });
      setText("");
      setThreads(await fetchDirectThreads());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <RequireAdmin>
      <AppShell hideNav>
        <LakersWallpaper>
          <AppHeader showBack backHref="/admin/users" title="Support Chat" />
          <main className="mx-auto max-w-5xl px-4 py-6">
            <div className="mb-4 flex flex-wrap gap-3 text-sm">
              <Link href="/admin/users" className="font-medium text-[#ED1C24] underline">
                Users
              </Link>
              <Link href="/admin/payments" className="font-medium text-[#ED1C24] underline">
                Payment submissions
              </Link>
              <Link href="/admin/messaging" className="font-medium text-[#ED1C24] underline">
                Broadcasts
              </Link>
            </div>
            {error && (
              <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                <p className="border-b border-gray-100 px-4 py-3 text-sm font-bold text-gray-900">
                  Conversations
                </p>
                {loading ? (
                  <p className="px-4 py-6 text-sm text-gray-500">Loading…</p>
                ) : threads.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-500">
                    No chats yet. Open a user from the Users page to start one.
                  </p>
                ) : (
                  <ul className="max-h-[70vh] overflow-y-auto">
                    {threads.map((thread) => (
                      <li key={thread.userId}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(thread.userId)}
                          className={`relative w-full border-b border-gray-50 px-4 py-3 text-left hover:bg-red-50 ${
                            selectedId === thread.userId ? "bg-red-50" : ""
                          }`}
                        >
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {names[thread.userId] || thread.userId}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {thread.lastMessage}
                          </p>
                          <p className="mt-0.5 text-[10px] text-gray-400">
                            {formatTime(thread.lastAt)}
                          </p>
                          {thread.unreadFromUser > 0 && (
                            <span className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ED1C24] px-1 text-[10px] font-bold text-white">
                              {thread.unreadFromUser}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>

              <section className="flex min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                {!selectedId ? (
                  <p className="m-auto px-4 text-sm text-gray-500">
                    Select a conversation to reply.
                  </p>
                ) : (
                  <>
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="font-bold text-gray-900">
                        {names[selectedId] || selectedId}
                      </p>
                      <p className="text-xs text-gray-500">{selectedId}</p>
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 px-3 py-3">
                      {messages.map((msg) => {
                        const mine = msg.senderId === user?.uid;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${mine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                                mine
                                  ? "bg-[#ED1C24] text-white"
                                  : "bg-white text-gray-900 shadow-sm"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">
                                {msg.message}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={bottomRef} />
                    </div>
                    <form
                      onSubmit={(e) => void reply(e)}
                      className="flex gap-2 border-t border-gray-100 p-3"
                    >
                      <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Reply as admin…"
                        className="min-w-0 flex-1 rounded-full border border-gray-200 px-3 py-2 text-sm focus:border-[#ED1C24] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={sending || !text.trim()}
                        className="rounded-full bg-[#ED1C24] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                      >
                        Send
                      </button>
                    </form>
                  </>
                )}
              </section>
            </div>
          </main>
        </LakersWallpaper>
      </AppShell>
    </RequireAdmin>
  );
}
