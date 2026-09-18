"use client";

import { useEffect, useRef, useState } from "react";
import type { UserProfile } from "@/context/UserContext";
import { useUser } from "@/context/UserContext";
import {
  emailDirectMessage,
  markThreadRead,
  sendDirectMessage,
  subscribeDirectMessages,
  type DirectMessage,
} from "@/lib/direct-messages";

function formatTime(date: Date): string {
  return date.toLocaleString("en-HK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminUserChatModal({
  target,
  onClose,
}: {
  target: UserProfile;
  onClose: () => void;
}) {
  const { user } = useUser();
  const threadId = target.uid ?? "";
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [alsoEmail, setAlsoEmail] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (!threadId) return;
    return subscribeDirectMessages(threadId, setMessages);
  }, [threadId]);

  useEffect(() => {
    if (!threadId || !user?.uid) return;
    void markThreadRead({ userId: threadId, readerId: user.uid });
  }, [threadId, user?.uid, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.uid || !threadId || !text.trim()) return;
    setSending(true);
    setError("");
    const body = text.trim();
    try {
      await sendDirectMessage({
        userId: threadId,
        senderId: user.uid,
        message: body,
      });
      if (alsoEmail && target.email) {
        await emailDirectMessage({
          to: target.email,
          recipientName: target.fullName,
          message: body,
        });
      }
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-[36rem] sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-chat-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 bg-[#ED1C24] px-4 py-3">
          <div>
            <h2 id="admin-user-chat-title" className="text-sm font-bold text-white">
              Message {target.fullName || target.email || "user"}
            </h2>
            <p className="mt-0.5 text-[11px] text-white/80">
              {target.email || "No email on file"} · in-app inbox
              {alsoEmail && target.email ? " + email" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-white hover:bg-white/15"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {!threadId ? (
          <p className="m-auto px-4 text-sm text-gray-500">
            This account has no auth uid yet, so chat cannot be opened.
          </p>
        ) : (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 px-3 py-3">
              {messages.length === 0 && (
                <p className="text-center text-xs text-gray-500">
                  No messages yet. Write a note — it is saved here and can be emailed.
                </p>
              )}
              {messages.map((msg) => {
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
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          mine ? "text-white/70" : "text-gray-400"
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            {error && (
              <p className="px-3 py-1 text-xs text-red-600">{error}</p>
            )}
            <form
              onSubmit={(e) => void send(e)}
              className="border-t border-gray-100 p-3"
            >
              <label className="mb-2 flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={alsoEmail}
                  disabled={!target.email}
                  onChange={(e) => setAlsoEmail(e.target.checked)}
                />
                Also send to email
                {!target.email ? " (no address)" : ""}
              </label>
              <div className="flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a message…"
                  className="min-w-0 flex-1 rounded-full border border-gray-200 px-3 py-2 text-sm focus:border-[#ED1C24] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="rounded-full bg-[#ED1C24] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
