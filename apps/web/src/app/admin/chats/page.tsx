"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppShell } from "@/components/AppShell";
import { LakersWallpaper } from "@/components/LakersWallpaper";
import { RequireAdmin } from "@/components/RequireAdmin";
import { useUser, type UserProfile } from "@/context/UserContext";
import {
  fetchAdminChatThreads,
  markAdminChatSeen,
  sendAdminChatMessage,
  subscribeAdminChatMessages,
  type AdminChatMessage,
  type AdminChatThread,
} from "@/lib/admin-chats";
import { fetchAllUsers } from "@/lib/users";

function formatTime(date: Date): string {
  return date.toLocaleString("en-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminChatsPage() {
  return (
    <RequireAdmin>
      <AdminChats />
    </RequireAdmin>
  );
}

function AdminChats() {
  const { user } = useUser();
  const [threads, setThreads] = useState<AdminChatThread[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [text, setText] = useState("");
  const [startUid, setStartUid] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [rows, roster] = await Promise.all([
          fetchAdminChatThreads(),
          fetchAllUsers()
            .then((r) => r.users)
            .catch(() => [] as UserProfile[]),
        ]);
        if (cancelled) return;
        setThreads(rows);
        setUsers(roster);
        const map: Record<string, string> = {};
        for (const u of roster) {
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
      void fetchAdminChatThreads().then(setThreads).catch(() => undefined);
    }, 12000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    return subscribeAdminChatMessages(selectedId, setMessages);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || !user?.uid) return;
    void markAdminChatSeen({ userId: selectedId, readerId: user.uid });
  }, [selectedId, user?.uid, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.uid || !selectedId || !text.trim()) return;
    setSending(true);
    setError("");
    try {
      await sendAdminChatMessage({
        userId: selectedId,
        senderId: user.uid,
        text: text.trim(),
      });
      setText("");
      const rows = await fetchAdminChatThreads();
      setThreads(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  function startChat() {
    const uid = startUid.trim();
    if (!uid) return;
    setSelectedId(uid);
    if (!names[uid]) {
      const match = users.find((u) => u.uid === uid || u.email === uid);
      if (match?.uid) {
        setSelectedId(match.uid);
        setNames((prev) => ({
          ...prev,
          [match.uid!]: match.fullName || match.email || match.uid!,
        }));
      }
    }
  }

  const selectedName =
    (selectedId && names[selectedId]) || selectedId || "User";

  return (
    <AppShell hideNav>
      <LakersWallpaper>
        <AppHeader showBack backHref="/admin/users" title="Admin chats" />
        <main className="mx-auto max-w-3xl px-4 py-6">
          <div className="rounded-2xl bg-white/95 p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Message from GraceRun
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  1:1 threads stored in{" "}
                  <code className="text-xs">adminChats/&#123;userId&#125;/messages</code>.
                </p>
              </div>
              <Link
                href="/admin/broadcast"
                className="text-sm font-medium text-[#ED1C24] underline"
              >
                Broadcast
              </Link>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={startUid}
                onChange={(e) => setStartUid(e.target.value)}
                placeholder="Start chat — user uid or email"
                className="min-h-11 flex-1 rounded-xl border border-gray-200 px-3 text-sm"
              />
              <button
                type="button"
                onClick={startChat}
                className="min-h-11 rounded-xl bg-[#ED1C24] px-4 text-sm font-bold text-white"
              >
                Open
              </button>
            </div>

            {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
              <aside className="max-h-[28rem] overflow-y-auto rounded-xl border border-gray-100">
                {loading ? (
                  <p className="p-3 text-sm text-gray-500">Loading…</p>
                ) : threads.length === 0 ? (
                  <p className="p-3 text-sm text-gray-500">No threads yet.</p>
                ) : (
                  <ul>
                    {threads.map((t) => (
                      <li key={t.userId}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(t.userId)}
                          className={`block w-full border-b border-gray-50 px-3 py-3 text-left text-sm ${
                            selectedId === t.userId
                              ? "bg-red-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <span className="block truncate font-semibold text-gray-900">
                            {names[t.userId] || t.userId}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-gray-500">
                            {t.lastMessage || "—"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>

              <section className="flex h-[28rem] flex-col rounded-xl border border-gray-100 bg-gray-50">
                {!selectedId ? (
                  <p className="m-auto px-4 text-sm text-gray-500">
                    Select a thread or start one with a user id.
                  </p>
                ) : (
                  <>
                    <div className="border-b border-gray-100 bg-white px-3 py-2">
                      <p className="text-sm font-bold text-gray-900">
                        {selectedName}
                      </p>
                      <p className="text-[11px] text-gray-500">{selectedId}</p>
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                      {messages.length === 0 ? (
                        <p className="text-center text-xs text-gray-500">
                          No messages yet.
                        </p>
                      ) : (
                        messages.map((msg) => {
                          const mine = msg.senderId === user?.uid;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${mine ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                                  mine
                                    ? "bg-[#ED1C24] text-white"
                                    : "bg-white text-gray-900 shadow-sm"
                                }`}
                              >
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                                <p
                                  className={`mt-1 text-[10px] ${
                                    mine ? "text-white/70" : "text-gray-400"
                                  }`}
                                >
                                  {formatTime(msg.createdAt)}
                                  {msg.seen ? " · Seen" : ""}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={bottomRef} />
                    </div>
                    <form
                      onSubmit={(e) => void send(e)}
                      className="flex gap-2 border-t border-gray-100 bg-white p-2"
                    >
                      <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Message from GraceRun…"
                        className="min-h-11 flex-1 rounded-xl border border-gray-200 px-3 text-sm"
                      />
                      <button
                        type="submit"
                        disabled={sending || !text.trim()}
                        className="min-h-11 rounded-xl bg-[#ED1C24] px-4 text-sm font-bold text-white disabled:opacity-50"
                      >
                        Send
                      </button>
                    </form>
                  </>
                )}
              </section>
            </div>
          </div>
        </main>
      </LakersWallpaper>
    </AppShell>
  );
}
