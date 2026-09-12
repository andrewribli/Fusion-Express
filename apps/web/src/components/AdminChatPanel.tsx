"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  markAdminThreadRead,
  sendAdminMessage,
  subscribeAdminMessages,
  unreadForViewer,
  uploadAdminChatImage,
  type AdminChatMessage,
  type AdminChatParty,
  type AdminChatRole,
} from "@/lib/admin-chat";
import { notifyNewAdminMessages } from "@/lib/notifications";

interface AdminChatPanelProps {
  orderId: string;
  party: AdminChatParty;
  viewerRole: AdminChatRole;
  viewerId: string;
  viewerName: string;
  /** Account id of the customer/runner on this thread (for participants). */
  partyUserId?: string;
  title: string;
  subtitle?: string;
  allowImage?: boolean;
  compact?: boolean;
  defaultOpen?: boolean;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-HK", { hour: "2-digit", minute: "2-digit" });
}

export function AdminChatPanel({
  orderId,
  party,
  viewerRole,
  viewerId,
  viewerName,
  partyUserId,
  title,
  subtitle,
  allowImage = false,
  compact = false,
  defaultOpen = false,
}: AdminChatPanelProps) {
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(!compact || defaultOpen);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeAdminMessages(orderId, party, setMessages);
  }, [orderId, party]);

  const unread = useMemo(
    () => unreadForViewer(messages, viewerRole),
    [messages, viewerRole],
  );

  // Notify only while collapsed; when open the messages are being read.
  useEffect(() => {
    if (compact && !expanded) {
      notifyNewAdminMessages(messages, viewerRole);
    }
  }, [messages, compact, expanded, viewerRole]);

  // Mark read while the thread is open and there is something unread.
  useEffect(() => {
    if (!expanded || unread === 0) return;
    void markAdminThreadRead(orderId, party, viewerRole);
  }, [expanded, unread, orderId, party, viewerRole]);

  useEffect(() => {
    if (expanded) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, expanded]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      await sendAdminMessage({
        orderId,
        party,
        senderId: viewerId,
        senderRole: viewerRole,
        senderName: viewerName,
        message: text,
        partyUserId,
      });
      setText("");
      setExpanded(true);
    } catch {
      setError("Could not send. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSending(true);
    setError("");
    try {
      const imageUrl = await uploadAdminChatImage(orderId, party, file);
      await sendAdminMessage({
        orderId,
        party,
        senderId: viewerId,
        senderRole: viewerRole,
        senderName: viewerName,
        message: text,
        imageUrl,
        partyUserId,
      });
      setText("");
      setExpanded(true);
    } catch {
      setError("Could not upload image. Try again.");
    } finally {
      setSending(false);
    }
  }

  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={`mt-3 flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md ${
          unread > 0 ? "bg-fusion-red" : "bg-lakers-navy"
        }`}
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg">
          🛟
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-fusion-red">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
        {unread > 0 ? `${unread} new from GraceRun admin` : title}
      </button>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-lakers-navy/20 bg-white shadow-sm">
      <div className="flex items-center justify-between bg-lakers-navy px-4 py-2.5">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          {subtitle && <p className="text-[11px] text-white/60">{subtitle}</p>}
        </div>
        {compact && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs text-lakers-gold"
          >
            Minimize
          </button>
        )}
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto bg-gray-50 px-3 py-3">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-gray-400">
            {viewerRole === "admin"
              ? "No messages yet."
              : "Message GraceRun about payment, your receipt, or any issue."}
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderRole === viewerRole;
            const isAdmin = msg.senderRole === "admin";
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    isAdmin
                      ? "bg-fusion-red text-white"
                      : "bg-white text-gray-900 ring-1 ring-gray-200"
                  }`}
                >
                  <p className="text-[10px] opacity-75">
                    {msg.senderName} · {formatTime(msg.createdAt)}
                  </p>
                  {msg.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={msg.imageUrl}
                      alt="Attachment"
                      className="mt-1 max-h-48 w-full rounded-lg object-cover"
                    />
                  )}
                  {msg.message && <p className="mt-0.5">{msg.message}</p>}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-gray-100 p-2">
        {error && <p className="mb-2 px-1 text-xs text-red-600">{error}</p>}
        <div className="flex items-center gap-2">
          {allowImage && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImage}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={sending}
                title="Attach receipt photo"
                className="rounded-xl border border-gray-200 px-3 py-2 text-base disabled:opacity-50"
              >
                📎
              </button>
            </>
          )}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              viewerRole === "admin" ? "Reply…" : "Message GraceRun…"
            }
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-fusion-red focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-xl bg-fusion-red px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {sending ? "…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
